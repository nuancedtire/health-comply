import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/core/middleware/auth-middleware";
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

export const createActionFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => CreateActionSchema.parse(data))
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const actionId = crypto.randomUUID();

        await db.insert(actions).values({
            id: actionId,
            practiceId: "practice_default",
            title: data.title,
            description: data.description,
            qualityStatementId: data.qualityStatementId,
            gapId: data.gapId,
            ownerUserId: user.id, // Assign to creator by default for MVP
            status: "open",
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            priority: data.priority,
            createdAt: new Date(),
        });

        return { success: true, actionId };
    });

export const listActionsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db } = context;
        return await db.select().from(actions).orderBy(desc(actions.createdAt));
    });
