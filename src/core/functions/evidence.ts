import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";

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
        const { db } = context;

        const evidence = await db.query.evidenceItems.findMany({
            where: eq(schema.evidenceItems.siteId, data.siteId),
            orderBy: desc(schema.evidenceItems.uploadedAt),
            with: {
                uploadedByUser: true,
                qs: true,
                category: true
            }
        });

        return evidence;
    });
