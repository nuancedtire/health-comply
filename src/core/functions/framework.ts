import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { keyQuestions, qualityStatements, evidenceCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const getKeyQuestionsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db } = context;
        const kqs = await db.select().from(keyQuestions).orderBy(keyQuestions.number);
        return kqs;
    });

export const getEvidenceCategoriesFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db } = context;
        return await db.select().from(evidenceCategories);
    });

export const getQualityStatementsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => {
        if (typeof data !== 'object' || data === null) {
            return {};
        }
        return z.object({
            kqId: z.string().optional()
        }).parse(data);
    })
    .handler(async ({ context, data }) => {
        const { db } = context;
        let query = db.select().from(qualityStatements);

        if (data?.kqId) {
            // @ts-ignore - complex query typing
            query = query.where(eq(qualityStatements.keyQuestionId, data.kqId));
        }

        return await query.orderBy(qualityStatements.statementNumber);
    });
