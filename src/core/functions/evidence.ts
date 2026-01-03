
// src/core/functions/evidence.ts
// import { createServerFn } from "@tanstack/react-start";
import { authenticatedFn } from "../base.server";
import { evidenceItems } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

// TEMPORARY STUB to fix build
// Needs schema alignment for evidenceVersions and Tags

const CreateEvidenceSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    evidenceDate: z.string(),
    categoryIds: z.array(z.string()),
    statementIds: z.array(z.string()).optional(),
    fileData: z.string().optional(),
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
});

export const createEvidenceItemFn = authenticatedFn
    .inputValidator((data: unknown) => CreateEvidenceSchema.parse(data))
    .handler(async () => {
        // Implementation disabled until schema is fixed
        throw new Error("Not implemented yet - Waiting for schema alignment");
    });

export const listEvidenceFn = authenticatedFn
    .handler(async ({ context }) => {
        const { db, session } = context;
        if (!session) throw new Error("Unauthorized");

        const items = await db.select().from(evidenceItems).orderBy(desc(evidenceItems.createdAt));
        return items;
    });
