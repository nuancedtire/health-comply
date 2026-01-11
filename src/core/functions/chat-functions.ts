import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../middleware/auth-middleware";
import { z } from "zod";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

// Shared Validator for Context
const ChatInitSchema = z.object({
    pageUrl: z.string(),
    pageTitle: z.string(),
    siteId: z.string().optional(),
    qsId: z.string().optional()
});

// Initialize Context (Call this when sidebar opens or page changes)
export const initChatFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof ChatInitSchema>) => ChatInitSchema.parse(data))
    .handler(async ({ data, context }) => {
        const { user, env } = context;

        // 1. Get Durable Object Stub
        // We use the User ID as the name to ensure each user gets their own persistent chat state.
        // OR we could make it ephemeral by using a random ID, but persistence is nice.
        const id = env.CHAT_AGENT.idFromName(user.id);
        const stub = env.CHAT_AGENT.get(id);

        // 2. Fetch User Role & Site
        // authMiddleware gives us the user, but roles are in a separate table
        const userRoles = await context.db.select({
            role: schema.userRoles.role,
            siteId: schema.userRoles.siteId
        })
            .from(schema.userRoles)
            .where(eq(schema.userRoles.userId, user.id));

        const primaryRole = userRoles[0]; // Active role (or first found)
        const siteId = data.siteId || primaryRole?.siteId || "current-site";

        // Fetch Tenant Name
        const tenant = await context.db.query.tenants.findFirst({
            where: eq(schema.tenants.id, (user as any).tenantId),
            columns: { name: true }
        });

        // Fetch Site Name if we have a valid site ID
        let siteName = "All Sites";
        if (siteId && siteId !== "current-site") {
            const site = await context.db.query.sites.findFirst({
                where: eq(schema.sites.id, siteId),
                columns: { name: true }
            });
            if (site) siteName = site.name;
        }

        const agentPayload = {
            userId: user.id,
            userName: user.name,
            role: primaryRole?.role || "user", // Fallback if no role found
            tenantId: (user as any).tenantId,
            tenantName: tenant?.name || "Unknown Tenant",
            siteId: siteId,
            siteName: siteName,
            pageContext: {
                url: data.pageUrl,
                title: data.pageTitle,
                qsId: data.qsId
            }
        };

        // 3. Send Init to Agent
        await stub.fetch("http://internal/init", {
            method: "POST",
            body: JSON.stringify(agentPayload)
        });

        return { success: true };
    });

// Send Message
export const sendMessageFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: { message: string }) => z.object({ message: z.string() }).parse(data))
    .handler(async ({ data, context }) => {
        const { user, env } = context;
        const id = env.CHAT_AGENT.idFromName(user.id);
        const stub = env.CHAT_AGENT.get(id);

        const response = await stub.fetch("http://internal/chat", {
            method: "POST",
            body: JSON.stringify({ message: data.message })
        });

        // Return structured JSON
        return await response.json();
    });

// Clear History
export const clearChatFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { user, env } = context;
        const id = env.CHAT_AGENT.idFromName(user.id);
        const stub = env.CHAT_AGENT.get(id);

        await stub.fetch("http://internal/clear");
        return { success: true };
    });
// Get Chat History
export const getChatHistoryFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { user, env } = context;
        const id = env.CHAT_AGENT.idFromName(user.id);
        const stub = env.CHAT_AGENT.get(id);

        const response = await stub.fetch("http://internal/history");
        const history: any[] = await response.json();

        return { history };
    });
