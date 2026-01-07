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

                // 7. Fetch Local Controls for this QS
                const siteId = (user as any).siteId;
                // NOTE: Similar to seed, we might need to find the siteId if not in user context.
                // fetch first site if needed.
                let targetSiteId = siteId;
                if (!targetSiteId) {
                    const firstSite = await db.query.sites.findFirst({
                        where: eq(schema.sites.tenantId, tenantId)
                    });
                    targetSiteId = firstSite?.id;
                }

                let relevantControls: any[] = [];
                if (targetSiteId) {
                    relevantControls = await db.query.localControls.findMany({
                        where: and(
                            eq(schema.localControls.tenantId, tenantId),
                            eq(schema.localControls.siteId, targetSiteId),
                            eq(schema.localControls.qsId, qs.id),
                            eq(schema.localControls.active, true)
                        )
                    });
                }

                // 8. Fetch distinct localControlIds that have APPROVED evidence
                // This is the source of truth for "Met" controls
                const approvedControlIds = new Set<string>();
                if (targetSiteId) {
                    const approvedEvidence = await db
                        .select({ localControlId: schema.evidenceItems.localControlId })
                        .from(schema.evidenceItems as any)
                        .where(
                            and(
                                eq(schema.evidenceItems.tenantId, tenantId),
                                eq(schema.evidenceItems.siteId, targetSiteId),
                                eq(schema.evidenceItems.qsId, qs.id),
                                eq(schema.evidenceItems.status, 'approved')
                            ) as any
                        );

                    approvedEvidence.forEach(e => {
                        if (e.localControlId) approvedControlIds.add(e.localControlId);
                    });
                }

                // REVISED SCORING LOGIC (STRICT APPROVAL):
                // If Local Controls exist, they form the denominator.
                // Progress = (Controls with APPROVED evidence / Total Controls) * 100
                // If NO Controls exist, fall back to "Approved Evidence > 0" logic (Legacy/Simple mode)

                // Count controls that have at least one approved evidence item linked
                const controlsWithEvidence = relevantControls.filter(c => approvedControlIds.has(c.id)).length;
                const totalControls = relevantControls.length;

                let completionPercentage = 0;
                let status: 'complete' | 'in-progress' | 'needs-attention' = 'needs-attention';

                if (totalControls > 0) {
                    completionPercentage = Math.round((controlsWithEvidence / totalControls) * 100);
                    if (completionPercentage === 100) status = 'complete';
                    else if (completionPercentage > 0) status = 'in-progress';
                    else {
                        // If we have evidence but it's not approved or not attached to controls properly
                        if (evidenceCount > 0) {
                            status = 'in-progress'; // Evidence exists but pending approval/sorting
                        } else {
                            status = 'needs-attention';
                        }
                    }
                } else {
                    // Fallback if no controls defined yet (Simple Mode)
                    if (approvedEvidenceCount > 0 && actionsCount === 0) {
                        completionPercentage = 100;
                        status = 'complete';
                    } else if (evidenceCount > 0 || actionsCount > 0) {
                        completionPercentage = 50; // "In Progress" if ANY evidence exists (even processing/pending)
                        status = 'in-progress';
                    } else {
                        completionPercentage = 0;
                        status = 'needs-attention';
                    }
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
                    localControls: relevantControls,
                    controlsMet: controlsWithEvidence, // Now strictly based on approved evidence
                    totalControls: totalControls
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
