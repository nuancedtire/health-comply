import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";
import { EVIDENCE_CATEGORIES } from "@/core/data/taxonomy";
import { logEvidenceEvent, AUDIT_ACTIONS } from "@/lib/audit";
import {
    validateStatusTransition,
    canUserApproveEvidence,
    canUserDeleteEvidence,
    type EvidenceStatus,
} from "@/lib/evidence-workflow";

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

        const suggestedControls = alias(schema.localControls, 'suggested_controls');

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
            // New fields
            classificationResult: schema.evidenceItems.classificationResult,
            suggestedControlId: schema.evidenceItems.suggestedControlId,
            reviewNotes: schema.evidenceItems.reviewNotes,
            reviewedBy: schema.evidenceItems.reviewedBy,
            reviewedAt: schema.evidenceItems.reviewedAt,
            
            // Flat joined fields
            localControlTitle: schema.localControls.title,
            suggestedControlTitle: suggestedControls.title,
            qsTitle: schema.cqcQualityStatements.title,
            kqTitle: schema.cqcKeyQuestions.title,
            uploaderName: schema.users.name
        })
            .from(schema.evidenceItems)
            .leftJoin(schema.users, eq(schema.evidenceItems.uploadedBy, schema.users.id))
            .leftJoin(schema.localControls, eq(schema.evidenceItems.localControlId, schema.localControls.id))
            .leftJoin(suggestedControls, eq(schema.evidenceItems.suggestedControlId, suggestedControls.id))
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
            classificationResult: item.classificationResult as any, // Cast JSON
            suggestedControlId: item.suggestedControlId,
            reviewNotes: item.reviewNotes,
            reviewedAt: item.reviewedAt,
            reviewedBy: item.reviewedBy,
            
            localControl: item.localControlTitle ? { title: item.localControlTitle } : null,
            suggestedControl: item.suggestedControlTitle ? { title: item.suggestedControlTitle } : null,
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

        let categories = await db.select().from(schema.evidenceCategories);

        if (categories.length === 0) {
            console.log("Seeding default evidence categories...");
            for (const cat of EVIDENCE_CATEGORIES) {
                await db.insert(schema.evidenceCategories).values(cat);
            }
            categories = EVIDENCE_CATEGORIES;
        }

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
            summary: z.string().optional(),
            // New fields
            reviewNotes: z.string().optional(),
            suggestedControlId: z.string().nullable().optional(),
            classificationResult: z.any().optional(), // Accept JSON object
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

        // 2. Status transition validation (State Machine)
        if (updates.status && updates.status !== existingItem.status) {
            validateStatusTransition(
                existingItem.status as EvidenceStatus,
                updates.status as EvidenceStatus
            );
        }

        // 3. Authorization checks for approval/rejection
        if (updates.status === 'approved' || updates.status === 'rejected') {
            const authCheck = await canUserApproveEvidence(db, {
                userId: user.id,
                evidenceId,
                tenantId,
            });

            if (!authCheck.allowed) {
                throw new Error(authCheck.reason);
            }
        }

        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        
        // Add metadata if status changes to review/approved/rejected
        if (updates.status && ['pending_review', 'approved', 'rejected'].includes(updates.status)) {
             // Track who reviewed it
             if (updates.status === 'approved' || updates.status === 'rejected') {
                 (cleanUpdates as any).reviewedBy = user.id;
                 (cleanUpdates as any).reviewedAt = new Date();
             }
        }

        // 4. Perform Update
        await db.update(schema.evidenceItems)
            .set(cleanUpdates)
            .where(
                and(
                    eq(schema.evidenceItems.id, evidenceId),
                    eq(schema.evidenceItems.tenantId, tenantId)
                )
            );

        // 5. Audit Logging
        const auditAction = updates.status === 'approved'
            ? AUDIT_ACTIONS.EVIDENCE_APPROVED
            : updates.status === 'rejected'
                ? AUDIT_ACTIONS.EVIDENCE_REJECTED
                : updates.status === 'pending_review'
                    ? AUDIT_ACTIONS.EVIDENCE_SUBMITTED
                    : AUDIT_ACTIONS.EVIDENCE_UPDATED;

        await logEvidenceEvent(db, {
            tenantId,
            actorUserId: user.id,
            evidenceId,
            action: auditAction,
            details: {
                previousStatus: existingItem.status,
                newStatus: updates.status || existingItem.status,
                reviewNotes: updates.reviewNotes,
                controlId: existingItem.localControlId || undefined,
            },
        });

        // 6. Post-Process: Update Local Control Timestamp if needed
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

        // 1. Authorization check
        const authCheck = await canUserDeleteEvidence(db, {
            userId: user.id,
            evidenceId,
            tenantId,
        });

        if (!authCheck.allowed) {
            throw new Error(authCheck.reason);
        }

        // 2. Get the item details before deletion
        const item = await db.query.evidenceItems.findFirst({
            where: and(
                eq(schema.evidenceItems.id, evidenceId),
                eq(schema.evidenceItems.tenantId, tenantId)
            ),
            columns: {
                r2Key: true,
                localControlId: true,
                status: true,
                title: true,
            }
        });

        if (!item) throw new Error("Item not found");

        // 3. Audit log BEFORE deletion (so we have the record)
        await logEvidenceEvent(db, {
            tenantId,
            actorUserId: user.id,
            evidenceId,
            action: AUDIT_ACTIONS.EVIDENCE_DELETED,
            details: {
                fileName: item.title,
                previousStatus: item.status,
                controlId: item.localControlId || undefined,
            },
        });

        // 4. Delete from R2
        if (env.R2 && item.r2Key) {
            await env.R2.delete(item.r2Key);
        }

        // 5. Delete the evidence
        await db.delete(schema.evidenceItems)
            .where(
                and(
                    eq(schema.evidenceItems.id, evidenceId),
                    eq(schema.evidenceItems.tenantId, tenantId)
                )
            );

        // 6. Recalculate lastEvidenceAt for the affected control
        if (item.localControlId) {
            const latestEvidence = await db.query.evidenceItems.findFirst({
                where: and(
                    eq(schema.evidenceItems.localControlId, item.localControlId),
                    eq(schema.evidenceItems.status, 'approved')
                ),
                orderBy: [desc(schema.evidenceItems.evidenceDate), desc(schema.evidenceItems.uploadedAt)],
                columns: { evidenceDate: true, uploadedAt: true }
            });

            // If we found other approved evidence, use its date. Otherwise null.
            const newLastEvidenceAt = latestEvidence
                ? (latestEvidence.evidenceDate || latestEvidence.uploadedAt)
                : null;

            await db.update(schema.localControls)
                .set({ lastEvidenceAt: newLastEvidenceAt })
                .where(eq(schema.localControls.id, item.localControlId));

            console.log(`Recalculated lastEvidenceAt for control ${item.localControlId}: ${newLastEvidenceAt}`);
        }

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

        if (!item) return undefined;

        return {
            ...item,
            classificationResult: item.classificationResult as any
        };
    });
