import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";

// Helper to get sites for the current user's tenant
export const getUserSitesFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId;

        if (!tenantId) {
            return []; // Should not happen for auth user
        }

        const sites = await db.select({
            id: schema.sites.id,
            name: schema.sites.name
        })
            .from(schema.sites as any)
            .where(eq(schema.sites.tenantId, tenantId) as any);

        return sites;
    });

export const getEvidenceForSiteFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({ siteId: z.string() }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;
        const siteId = data.siteId;

        if (!tenantId) {
            return []; // Should not happen for auth user
        }

        // Use explicit joins and flat selection to avoid TS inference issues with deep nesting
        const rawEvidence = await db.select({
            id: schema.evidenceItems.id,
            siteId: schema.evidenceItems.siteId,
            title: schema.evidenceItems.title,
            qsId: schema.evidenceItems.qsId,
            evidenceCategoryId: schema.evidenceItems.evidenceCategoryId,
            localControlId: schema.evidenceItems.localControlId,
            status: schema.evidenceItems.status,
            uploadedAt: schema.evidenceItems.uploadedAt,
            evidenceDate: schema.evidenceItems.evidenceDate,
            sizeBytes: schema.evidenceItems.sizeBytes,
            mimeType: schema.evidenceItems.mimeType,
            summary: schema.evidenceItems.summary,
            aiConfidence: schema.evidenceItems.aiConfidence,
            textContent: schema.evidenceItems.textContent,
            validUntil: schema.evidenceItems.validUntil,
            createdAt: schema.evidenceItems.createdAt,
            // Flat joined fields
            localControlTitle: schema.localControls.title,
            qsTitle: schema.cqcQualityStatements.title,
            kqTitle: schema.cqcKeyQuestions.title,
            uploaderName: schema.users.name
        })
            .from(schema.evidenceItems)
            .leftJoin(schema.users, eq(schema.evidenceItems.uploadedBy, schema.users.id))
            .leftJoin(schema.localControls, eq(schema.evidenceItems.localControlId, schema.localControls.id))
            .leftJoin(schema.cqcQualityStatements, eq(schema.evidenceItems.qsId, schema.cqcQualityStatements.id))
            .leftJoin(schema.cqcKeyQuestions, eq(schema.cqcQualityStatements.keyQuestionId, schema.cqcKeyQuestions.id))
            .where(
                and(
                    eq(schema.evidenceItems.tenantId, tenantId),
                    eq(schema.evidenceItems.siteId, siteId)
                )
            )
            .orderBy(desc(schema.evidenceItems.uploadedAt));

        // Transform to nested structure expected by UI
        return rawEvidence.map(item => ({
            id: item.id,
            siteId: item.siteId,
            title: item.title,
            qsId: item.qsId,
            evidenceCategoryId: item.evidenceCategoryId,
            localControlId: item.localControlId,
            status: item.status,
            uploadedAt: item.uploadedAt,
            evidenceDate: item.evidenceDate,
            sizeBytes: item.sizeBytes,
            mimeType: item.mimeType,
            summary: item.summary,
            aiConfidence: item.aiConfidence,
            textContent: item.textContent,
            validUntil: item.validUntil,
            createdAt: item.createdAt,
            uploaderName: item.uploaderName,
            localControl: item.localControlTitle ? { title: item.localControlTitle } : null,
            qs: item.qsTitle ? {
                title: item.qsTitle,
                keyQuestion: item.kqTitle ? { title: item.kqTitle } : null
            } : null
        }));
    });

export const getEvidenceReferenceDataFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db } = context;

        const categories = await db.select().from(schema.evidenceCategories);
        const keyQuestions = await db.select().from(schema.cqcKeyQuestions).orderBy(schema.cqcKeyQuestions.displayOrder);
        const qualityStatements = await db.select({
            id: schema.cqcQualityStatements.id,
            title: schema.cqcQualityStatements.title,
            code: schema.cqcQualityStatements.code,
            keyQuestionId: schema.cqcQualityStatements.keyQuestionId
        }).from(schema.cqcQualityStatements);

        return { categories, qualityStatements, keyQuestions };
    });

export const updateEvidenceFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        evidenceId: z.string(),
        updates: z.object({
            title: z.string().optional(),
            status: z.string().optional(),
            localControlId: z.string().nullable().optional(),
            evidenceCategoryId: z.string().optional(),
            qsId: z.string().optional(),
            summary: z.string().optional()
        })
    }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;
        const { evidenceId, updates } = data;

        // 1. Fetch existing item to compare state (+ check tenant)
        const existingItem = await db.query.evidenceItems.findFirst({
            where: and(
                eq(schema.evidenceItems.id, evidenceId),
                eq(schema.evidenceItems.tenantId, tenantId)
            )
        });

        if (!existingItem) {
            throw new Error("Evidence item not found");
        }

        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );

        // 2. Perform Update
        await db.update(schema.evidenceItems)
            .set(cleanUpdates)
            .where(
                and(
                    eq(schema.evidenceItems.id, evidenceId),
                    eq(schema.evidenceItems.tenantId, tenantId)
                )
            );

        // 3. Post-Process: Update Local Control Timestamp if needed
        // Condition: Evidence IS approved (either newly or already) AND it has a local control
        const newStatus = (cleanUpdates.status as string) || existingItem.status;
        const newControlId = (cleanUpdates.localControlId !== undefined ? cleanUpdates.localControlId : existingItem.localControlId) as string | null;

        if (newStatus === 'approved' && newControlId) {
            // Check if we need to update:
            // - Status changed to approved
            // - OR Control ID changed while approved
            const statusChanged = updates.status && updates.status === 'approved' && existingItem.status !== 'approved';
            const controlChanged = updates.localControlId && updates.localControlId !== existingItem.localControlId;

            if (statusChanged || controlChanged) {
                // Update the control's lastEvidenceAt
                // We use evidenceDate if available, else uploadedAt
                const validDate = existingItem.evidenceDate || existingItem.uploadedAt;

                await db.update(schema.localControls)
                    .set({ lastEvidenceAt: validDate })
                    .where(eq(schema.localControls.id, newControlId));

                console.log(`Updated lastEvidenceAt for control ${newControlId} due to evidence approval.`);
            }
        }

        return { success: true };
    });

export const deleteEvidenceFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({ evidenceId: z.string() }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, env, user } = context;
        const tenantId = (user as any).tenantId;
        const { evidenceId } = data;

        const item = await db.query.evidenceItems.findFirst({
            where: and(
                eq(schema.evidenceItems.id, evidenceId),
                eq(schema.evidenceItems.tenantId, tenantId)
            ),
            columns: { r2Key: true }
        });

        if (!item) throw new Error("Item not found");

        if (env.R2) {
            await env.R2.delete(item.r2Key);
        }

        await db.delete(schema.evidenceItems)
            .where(
                and(
                    eq(schema.evidenceItems.id, evidenceId),
                    eq(schema.evidenceItems.tenantId, tenantId)
                )
            );

        return { success: true };
    });

export const downloadEvidenceFileFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({ evidenceId: z.string() }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, env, user } = context;
        const tenantId = (user as any).tenantId;
        const { evidenceId } = data;

        const item = await db.query.evidenceItems.findFirst({
            where: and(
                eq(schema.evidenceItems.id, evidenceId),
                eq(schema.evidenceItems.tenantId, tenantId)
            ),
            columns: { r2Key: true, mimeType: true, title: true }
        });

        if (!item) {
            throw new Error("Item not found");
        }

        if (!env.R2) {
            throw new Error("R2 storage not configured");
        }

        const object = await env.R2.get(item.r2Key);

        if (!object) {
            throw new Error("File not found in storage");
        }

        const headers = new Headers();
        headers.set("Content-Type", item.mimeType);
        headers.set("Content-Disposition", `attachment; filename="${item.title}"`);
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);

        return new Response(object.body, {
            headers
        });
    });

export const getEvidenceFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({ evidenceId: z.string() }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;
        const evidenceId = data.evidenceId;

        const item = await db.query.evidenceItems.findFirst({
            where: and(
                eq(schema.evidenceItems.id, evidenceId),
                eq(schema.evidenceItems.tenantId, tenantId)
            ),
            with: {
                localControl: { columns: { title: true } },
                qs: {
                    columns: { title: true },
                    with: { keyQuestion: { columns: { title: true } } }
                }
            }
        });

        return item;
    });
