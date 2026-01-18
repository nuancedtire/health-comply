import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { eq } from "drizzle-orm";
import { EVIDENCE_CATEGORIES } from "@/core/data/taxonomy";
import { classifyDocument } from "@/lib/services/document-classifier";
import { logEvidenceEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { validateFileType, validateFileSize } from "@/lib/file-validation";

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

        // Server-side file validation
        const sizeValidation = validateFileSize(file.size, 10);
        if (!sizeValidation.valid) {
            throw new Error(sizeValidation.reason);
        }

        const typeValidation = await validateFileType(file, file.type);
        if (!typeValidation.valid) {
            throw new Error(typeValidation.reason || "Invalid file type");
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

            // Pre-Validate FKs
            const [qsExists, catExists] = await Promise.all([
                db.select({ id: schema.cqcQualityStatements.id }).from(schema.cqcQualityStatements as any).where(eq(schema.cqcQualityStatements.id, qsId as any)).get(),
                db.select({ id: schema.evidenceCategories.id }).from(schema.evidenceCategories as any).where(eq(schema.evidenceCategories.id, categoryId as any)).get(),
            ]);

            if (!qsExists) {
                console.error(`Quality Statement '${qsId}' not found.`);
                // Ideally handle this gracefully or throw
            }

            if (!catExists) {
                const knownCategory = EVIDENCE_CATEGORIES.find(c => c.id === categoryId);
                if (knownCategory) {
                    await db.insert(schema.evidenceCategories).values(knownCategory);
                } else {
                    throw new Error(`Evidence Category '${categoryId}' not found.`);
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

            // 4. Audit log the upload
            await logEvidenceEvent(db, {
                tenantId: tenantId as string,
                actorUserId: user.id,
                evidenceId,
                action: AUDIT_ACTIONS.EVIDENCE_UPLOADED,
                details: {
                    fileName: file.name,
                    controlId: localControlId || undefined,
                    qsId,
                },
            });

            // 5. Trigger Workflow or Simulate
            if (env && env.EVIDENCE_INGEST_WORKFLOW) {
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
                // Simulate Classification locally for Dev
                if (!localControlId) {
                    const classification = await classifyDocument("", file.name);
                    
                    // Attempt to find a real control for the mock match to avoid FK errors
                    if (classification.type === 'match') {
                        const anyControl = await db.query.localControls.findFirst({
                            where: eq(schema.localControls.tenantId, tenantId),
                            columns: { id: true, title: true }
                        });
                        
                        if (anyControl) {
                            classification.matchedControlId = anyControl.id;
                            classification.matchedControlTitle = anyControl.title;
                        } else {
                            // If no controls exist, we can't match. Downgrade to suggestion/irrelevant
                            classification.type = 'suggestion';
                            classification.confidence = 60;
                            classification.reasoning += " (No existing controls found to match against)";
                            delete classification.matchedControlId;
                        }
                    }

                    await db.update(schema.evidenceItems)
                        .set({
                            status: 'draft',
                            classificationResult: classification as any,
                            suggestedControlId: classification.matchedControlId || null
                        })
                        .where(eq(schema.evidenceItems.id, evidenceId));
                } else {
                    // Direct assignment
                    await db.update(schema.evidenceItems)
                        .set({ status: 'pending_review' })
                        .where(eq(schema.evidenceItems.id, evidenceId));
                }
            }

            return { success: true, evidenceId };
        } catch (e: any) {
            console.error("Upload failed", e);
            throw new Error(`Upload error: ${e.message}`);
        }
    });
