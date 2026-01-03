
// src/core/functions/actions.ts
// import { createServerFn } from "@tanstack/react-start"; // Unused
import { authenticatedFn } from "../base.server";
import { actions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

const CreateActionSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    qualityStatementId: z.string().optional(),
    gapId: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const createActionFn = authenticatedFn
    .inputValidator((data: unknown) => CreateActionSchema.parse(data))
    .handler(async ({ context, data }) => {
        const { db, session } = context;

        if (!session) {
            throw new Error("Unauthorized");
        }

        const actionId = crypto.randomUUID();

        await db.insert(actions).values({
            id: actionId,
            tenantId: session.tenantId, // Use session tenant
            siteId: session.siteId || "s_demo", // Fallback or enforce siteId
            qsId: data.qualityStatementId || "qs_default", // Needs proper FK handling
            title: data.title,
            description: data.description,
            ownerUserId: session.userId,
            status: "open",
            dueAt: data.dueDate ? Math.floor(new Date(data.dueDate).getTime() / 1000) : undefined, // Schema is integer
            createdAt: Math.floor(Date.now() / 1000), // Schema is integer
            updatedAt: Math.floor(Date.now() / 1000),
        });

        return { success: true, actionId };
    });

export const listActionsFn = authenticatedFn
    .handler(async ({ context }) => {
        const { db, session } = context;
        if (!session) throw new Error("Unauthorized");

        return await db.select().from(actions).orderBy(desc(actions.createdAt));
    });
