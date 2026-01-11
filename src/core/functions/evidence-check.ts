import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";

export const checkEvidenceExistsFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        siteId: z.string(),
        fileName: z.string()
    }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;

        const existing = await db.query.evidenceItems.findFirst({
            where: and(
                eq(schema.evidenceItems.tenantId, tenantId),
                eq(schema.evidenceItems.siteId, data.siteId),
                eq(schema.evidenceItems.title, data.fileName)
            ),
            columns: { id: true, title: true }
        });

        return !!existing;
    });
