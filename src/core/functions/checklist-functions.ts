import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";

export const getChecklistDataFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;

        if (!user) {
            throw new Error("Unauthorized: User must be logged in.");
        }

        const tenantId = (user as any).tenantId;
        if (!tenantId) {
            throw new Error("User must belong to a tenant.");
        }

        // For now, we'll get data for all sites the user has access to
        // In the future, we can add site filtering

        // 1. Fetch all key questions with their quality statements
        const keyQuestions = await db
            .select()
            .from(schema.cqcKeyQuestions as any)
            .orderBy(schema.cqcKeyQuestions.displayOrder);

        const checklistData = [];

        for (const kq of keyQuestions) {
            // 2. Fetch quality statements for this key question
            const qualityStatements = await db
                .select()
                .from(schema.cqcQualityStatements as any)
                .where(eq(schema.cqcQualityStatements.keyQuestionId, kq.id) as any)
                .orderBy(schema.cqcQualityStatements.displayOrder);

            const qsWithCounts = [];

            for (const qs of qualityStatements) {
                // 3. Count evidence items for this quality statement
                const evidenceCountResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.evidenceItems as any)
                    .where(
                        and(
                            eq(schema.evidenceItems.tenantId, tenantId),
                            eq(schema.evidenceItems.qsId, qs.id)
                        ) as any
                    )
                    .get();

                const evidenceCount = evidenceCountResult?.count || 0;

                // 4. Count approved evidence items
                const approvedEvidenceResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.evidenceItems as any)
                    .where(
                        and(
                            eq(schema.evidenceItems.tenantId, tenantId),
                            eq(schema.evidenceItems.qsId, qs.id),
                            eq(schema.evidenceItems.status, 'approved')
                        ) as any
                    )
                    .get();

                const approvedEvidenceCount = approvedEvidenceResult?.count || 0;

                // 5. Count open actions for this quality statement
                const actionsCountResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.actions as any)
                    .where(
                        and(
                            eq(schema.actions.tenantId, tenantId),
                            eq(schema.actions.qsId, qs.id),
                            eq(schema.actions.status, 'open')
                        ) as any
                    )
                    .get();

                const actionsCount = actionsCountResult?.count || 0;

                // 6. Calculate completion percentage
                // Simple logic: if has approved evidence and no open actions = 100%, else based on evidence count
                let completionPercentage = 0;
                let status: 'complete' | 'in-progress' | 'needs-attention' = 'needs-attention';

                if (approvedEvidenceCount > 0 && actionsCount === 0) {
                    completionPercentage = 100;
                    status = 'complete';
                } else if (evidenceCount > 0 || actionsCount > 0) {
                    // In progress if has any evidence or actions being worked on
                    completionPercentage = Math.min(
                        Math.round((approvedEvidenceCount / Math.max(1, evidenceCount)) * 100),
                        90 // Cap at 90% if there are open actions
                    );
                    status = 'in-progress';
                } else {
                    completionPercentage = 0;
                    status = 'needs-attention';
                }

                qsWithCounts.push({
                    id: qs.id,
                    title: qs.title,
                    code: qs.code,
                    evidenceCount,
                    approvedEvidenceCount,
                    actionsCount,
                    completionPercentage,
                    status,
                });
            }

            // 7. Calculate overall progress for this key question
            const overallProgress = qsWithCounts.length > 0
                ? Math.round(
                    qsWithCounts.reduce((sum, qs) => sum + qs.completionPercentage, 0) / qsWithCounts.length
                )
                : 0;

            checklistData.push({
                id: kq.id,
                title: kq.title,
                displayOrder: kq.displayOrder,
                qualityStatements: qsWithCounts,
                overallProgress,
            });
        }

        // 8. Calculate total overall progress
        const totalOverallProgress = checklistData.length > 0
            ? Math.round(
                checklistData.reduce((sum, kq) => sum + kq.overallProgress, 0) / checklistData.length
            )
            : 0;

        return {
            keyQuestions: checklistData,
            overallProgress: totalOverallProgress,
        };
    });
