import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { qualityStatements, statementAssessments, keyQuestions, gaps, actions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export const getReadinessOverviewFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db } = context;

        // Group by KQ and get counts
        // This requires complex aggregation or multiple queries
        // Simple approach: get all params and aggregate in code for MVP simplicity

        const allKqs = await db.select().from(keyQuestions);
        const allStatements = await db.select().from(qualityStatements);
        const allAssessments = await db.select().from(statementAssessments).where(eq(statementAssessments.isLatest, true));

        // Map to shape
        const stats = allKqs.map((kq: typeof keyQuestions.$inferSelect) => {
            const kqStmts = allStatements.filter((s: typeof qualityStatements.$inferSelect) => s.keyQuestionId === kq.id);
            const assessedCount = kqStmts.filter((s: typeof qualityStatements.$inferSelect) =>
                allAssessments.some((a: typeof statementAssessments.$inferSelect) => a.qualityStatementId === s.id)
            ).length;

            return {
                ...kq,
                totalStatements: kqStmts.length,
                assessedCount,
                coveragePercent: kqStmts.length > 0 ? (assessedCount / kqStmts.length) * 100 : 0
            };
        });

        return stats;
    });

export const getStatementDetailFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
    .handler(async ({ context, data }) => {
        const { db } = context;

        const statement = await db.select().from(qualityStatements).where(eq(qualityStatements.id, data.id)).get();

        if (!statement) {
            throw new Error("Statement not found");
        }

        const assessment = await db.select().from(statementAssessments)
            .where(and(
                eq(statementAssessments.qualityStatementId, data.id),
                eq(statementAssessments.isLatest, true)
            ))
            .get();

        const statementGaps = await db.select().from(gaps)
            .where(eq(gaps.qualityStatementId, data.id));

        const statementActions = await db.select().from(actions)
            .where(eq(actions.qualityStatementId, data.id));

        return {
            statement,
            assessment,
            gaps: statementGaps,
            actions: statementActions
        };
    });
