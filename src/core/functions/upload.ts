import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { authMiddleware } from "@/core/middleware/auth-middleware";

export const uploadEvidenceFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => {
        return data as FormData;
    })
    .handler(async (ctx) => {
        // TanStack Start parses the input and passes it as ctx.data
        // We cast it to FormData in the validator, so it should be available here.
        const formData = ctx.data as FormData;

        const context = ctx.context as any;
        const { db, user } = context;
        const env = context.env;

        const file = formData.get("file") as File;

        let qsId = formData.get("qsId") as string;
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
        const r2Key = `t/${tenantId}/s/${siteId}/qs/${qsId}/evidence/${categoryId}/${date}/${evidenceId}.${ext}`;

        try {
            if (!env || !env.R2) {
                throw new Error("R2 binding not found in context.");
            }

            await env.R2.put(r2Key, file.stream(), {
                httpMetadata: { contentType: file.type }
            });

            // 3. Insert into DB
            const now = new Date();
            await db.insert(schema.evidenceItems).values({
                id: evidenceId,
                tenantId: tenantId as string,
                siteId,
                qsId,
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
