import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Available AI models
export const AI_MODELS = [
    { id: 'cerebras/zai-glm-4.7', name: 'Cerebras ZAI-GLM 4.7', provider: 'Cerebras', description: 'Fast inference, great for compliance tasks' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable, best reasoning' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and cost-effective' },
    { id: 'anthropic/claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic', description: 'Balanced performance' },
] as const;

export type AIModelId = typeof AI_MODELS[number]['id'];

// Get user preferences
export const getUserPreferencesFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, user } = context;

        const prefs = await db.select()
            .from(schema.userPreferences)
            .where(eq(schema.userPreferences.userId, user.id))
            .get();

        return prefs || {
            userId: user.id,
            aiModel: 'cerebras/zai-glm-4.7',
            updatedAt: new Date()
        };
    });

// Update AI model preference
const UpdateAIModelSchema = z.object({
    aiModel: z.string()
});

export const updateAIModelFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator((data: z.infer<typeof UpdateAIModelSchema>) => UpdateAIModelSchema.parse(data))
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const { aiModel } = data;

        // Validate model is in our list
        const validModel = AI_MODELS.find(m => m.id === aiModel);
        if (!validModel) {
            throw new Error("Invalid AI model selected");
        }

        // Upsert preference
        const existing = await db.select()
            .from(schema.userPreferences)
            .where(eq(schema.userPreferences.userId, user.id))
            .get();

        if (existing) {
            await db.update(schema.userPreferences)
                .set({ aiModel, updatedAt: new Date() })
                .where(eq(schema.userPreferences.userId, user.id));
        } else {
            await db.insert(schema.userPreferences)
                .values({ userId: user.id, aiModel, updatedAt: new Date() });
        }

        return { success: true, aiModel };
    });

// Get user sessions
export const getUserSessionsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, user, session } = context;

        const sessions = await db.select({
            id: schema.sessions.id,
            createdAt: schema.sessions.createdAt,
            expiresAt: schema.sessions.expiresAt,
            ipAddress: schema.sessions.ipAddress,
            userAgent: schema.sessions.userAgent,
        })
            .from(schema.sessions)
            .where(eq(schema.sessions.userId, user.id))
            .orderBy(desc(schema.sessions.createdAt));

        // Mark current session
        return sessions.map(s => ({
            ...s,
            isCurrent: s.id === session.id
        }));
    });

// Revoke a session
const RevokeSessionSchema = z.object({
    sessionId: z.string()
});

export const revokeSessionFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator((data: z.infer<typeof RevokeSessionSchema>) => RevokeSessionSchema.parse(data))
    .handler(async ({ context, data }) => {
        const { db, user, session } = context;
        const { sessionId } = data;

        // Don't allow revoking current session
        if (sessionId === session.id) {
            throw new Error("Cannot revoke current session. Use logout instead.");
        }

        // Only delete sessions belonging to this user
        await db.delete(schema.sessions)
            .where(eq(schema.sessions.id, sessionId));

        return { success: true };
    });

// Update user profile (display name)
const UpdateProfileSchema = z.object({
    name: z.string().min(2).max(100)
});

export const updateProfileFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .validator((data: z.infer<typeof UpdateProfileSchema>) => UpdateProfileSchema.parse(data))
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const { name } = data;

        await db.update(schema.users)
            .set({ name, updatedAt: new Date() })
            .where(eq(schema.users.id, user.id));

        return { success: true, name };
    });
