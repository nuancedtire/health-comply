import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { eq } from "drizzle-orm";
import { EVIDENCE_CATEGORIES } from "@/core/data/taxonomy";

export const uploadEvidenceFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => {
        return data as FormData;
    })
    .handler(async (ctx) => {
        // TanStack Start parses the input and passes it as ctx.data
        const formData = ctx.data as FormData;

        const context = ctx.context as any;
        const { db, user } = context;
        const env = context.env;

        const file = formData.get("file") as File;

        let qsId = formData.get("qsId") as string;
        let localControlId = formData.get("localControlId") as string;
        let categoryId = formData.get("categoryId") as string;
        const siteId = formData.get("siteId") as string;

        if (!file || !siteId) {
            throw new Error("Missing required fields (file, siteId)");
        }

        const tenantId = user.tenantId;

        // Fallbacks for Auto-Triage
        if (!qsId) qsId = 'safe.safeguarding';
        if (!categoryId) categoryId = 'processes';

        const evidenceId = `ev_${crypto.randomUUID()}`;
        const date = new Date().toISOString().slice(0, 7);
        const ext = file.name.split('.').pop() || 'bin';
        const r2Key = `t/${tenantId}/s/${siteId}/evidence/${date}/${evidenceId}.${ext}`;

        try {
            if (!env || !env.R2) {
                console.warn("R2 binding missing - Mocking upload for dev/test");
                // In a real local setup we might not have R2 mocked perfectly, 
                // but let's proceed to DB to at least see the entry.
                // throw new Error("R2 binding not found in context.");
            } else {
                await env.R2.put(r2Key, file.stream(), {
                    httpMetadata: { contentType: file.type },
                    customMetadata: {
                        qsId,
                        categoryId,
                        siteId,
                        uploadedBy: user.id
                    }
                });
            }

            // Pre-Validate FKs to give better error messages
            const [qsExists, catExists] = await Promise.all([
                db.select({ id: schema.cqcQualityStatements.id }).from(schema.cqcQualityStatements as any).where(eq(schema.cqcQualityStatements.id, qsId as any)).get(),
                db.select({ id: schema.evidenceCategories.id }).from(schema.evidenceCategories as any).where(eq(schema.evidenceCategories.id, categoryId as any)).get(),
            ]);

            if (!qsExists) {
                // For robustness in this "Auto" mode, if safe.safeguarding is missing, use meaningful defaults or skip
                // Ideally this should not happen if seeded.
                console.error(`Quality Statement '${qsId}' not found. Falling back or failing.`);
                // throw new Error(`Quality Statement '${qsId}' not found in database.`);
            }
            // Proceed anyway if strictly needed, or throw after ensuring seed is run.
            // Check if seeded - if not, maybe we should auto-seed or fail gracefully.
            if (!qsExists) throw new Error(`System Error: Quality Statement '${qsId}' missing. Please run 'Seeding'.`);

            if (!catExists) {
                const knownCategory = EVIDENCE_CATEGORIES.find(c => c.id === categoryId);
                if (knownCategory) {
                    console.log(`Auto-seeding missing category: ${categoryId} during upload`);
                    await db.insert(schema.evidenceCategories).values(knownCategory);
                } else {
                    throw new Error(`Evidence Category '${categoryId}' not found. Please 'Seed CQC Data'.`);
                }
            }

            // 3. Insert into DB
            const now = new Date();
            await db.insert(schema.evidenceItems).values({
                id: evidenceId,
                tenantId: tenantId as string,
                siteId,
                qsId,
                localControlId: localControlId || null,
                evidenceCategoryId: categoryId,
                title: file.name,
                r2Key,
                mimeType: file.type,
                sizeBytes: file.size,
                uploadedBy: user.id,
                uploadedAt: now,
                createdAt: now,
                status: 'processing'
            });

            // 4. Trigger Workflow
            if (env.EVIDENCE_INGEST_WORKFLOW) {
                await env.EVIDENCE_INGEST_WORKFLOW.create({
                    id: evidenceId,
                    params: {
                        evidenceId,
                        fileContext: {
                            filename: file.name,
                            mimeType: file.type
                        }
                    }
                });
            } else {
                console.warn("WORKFLOW_BINDING (EVIDENCE_INGEST_WORKFLOW) not found");
            }

            return { success: true, evidenceId };
        } catch (e: any) {
            console.error("Upload failed", e);
            throw new Error(`Upload error: ${e.message}`);
        }
    });
