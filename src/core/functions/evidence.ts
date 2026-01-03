import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { evidenceItems, evidenceVersions, evidenceItemTags } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

const CreateEvidenceSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    evidenceDate: z.string(), // ISO date
    categoryIds: z.array(z.string()),
    statementIds: z.array(z.string()).optional(),
    fileData: z.string().optional(), // Base64 for MVP small files, or handle separately
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
});

export const createEvidenceItemFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => CreateEvidenceSchema.parse(data))
    .handler(async ({ context, data }) => {
        const { db, env, user } = context;
        const evidenceId = crypto.randomUUID();
        const versionId = crypto.randomUUID();

        // 1. Upload to R2 if file data present strategy
        // For MVP, if fileData is base64 string
        let r2Key = null;
        let r2Bucket = "health-comply";

        if (data.fileData && data.fileName && env.R2) {
            r2Key = `${evidenceId}/${versionId}/${data.fileName}`;
            // decode base64
            const binaryString = atob(data.fileData.split(',')[1] || data.fileData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            await env.R2.put(r2Key, bytes);
        }

        // 2. Insert Evidence Item
        await db.insert(evidenceItems).values({
            id: evidenceId,
            practiceId: "practice_default", // Hardcoded for seeded practice
            title: data.title,
            description: data.description,
            ownerUserId: user.id,
            evidenceDate: new Date(data.evidenceDate),
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // 3. Insert Version
        await db.insert(evidenceVersions).values({
            id: versionId,
            evidenceItemId: evidenceId,
            versionNumber: 1,
            sourceType: "upload",
            r2Bucket: r2Bucket,
            r2ObjectKey: r2Key,
            fileName: data.fileName,
            mimeType: data.mimeType,
            createdAt: new Date(),
        });

        // 4. Tags
        for (const catId of data.categoryIds) {
            await db.insert(evidenceItemTags).values({
                id: crypto.randomUUID(),
                evidenceItemId: evidenceId,
                evidenceCategoryId: catId,
                createdBy: user.id,
                createdAt: new Date(),
            });
        }

        if (data.statementIds) {
            for (const stId of data.statementIds) {
                await db.insert(evidenceItemTags).values({
                    id: crypto.randomUUID(),
                    evidenceItemId: evidenceId,
                    qualityStatementId: stId,
                    createdBy: user.id,
                    createdAt: new Date(),
                });
            }
        }

        return { success: true, evidenceId };
    });

export const listEvidenceFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db } = context;
        // Simple fetch for list
        const items = await db.select().from(evidenceItems).orderBy(desc(evidenceItems.createdAt));
        return items;
    });
