import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";

export const getChecklistDataFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => {
        return z.object({
            siteId: z.string().optional()
        }).optional().parse(data);
    })
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const inputSiteId = ctx.data?.siteId;

        if (!user) {
            throw new Error("Unauthorized: User must be logged in.");
        }

        const tenantId = (user as any).tenantId;
        if (!tenantId) {
            throw new Error("User must belong to a tenant.");
        }

        // Determine effective Site ID
        // 1. If user is site-scoped, FORCE their site ID.
        // 2. If user is tenant-scoped (PM/Admin), use inputSiteId or fallback to first site.

        let targetSiteId = inputSiteId;
        const userSiteId = (user as any).siteId; // From auth context if available

        if (userSiteId) {
            // If user is strictly site-scoped (e.g. GP Partner), they can only see their site
            // We assume auth middleware populates this for site-scoped roles
            targetSiteId = userSiteId;
        }

        // Fallback: If no site selected/enforced, grab the first one to show SOMETHING
        if (!targetSiteId) {
            const firstSite = await db.query.sites.findFirst({
                where: eq(schema.sites.tenantId, tenantId)
            });
            targetSiteId = firstSite?.id;
        }

        if (!targetSiteId) {
            // Edge case: Tenant has no sites? Return empty.
            return {
                keyQuestions: [],
                overallProgress: 0,
            };
        }

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
                // 3. Count evidence items for this QS and SITE
                const evidenceCountResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.evidenceItems as any)
                    .where(
                        and(
                            eq(schema.evidenceItems.tenantId, tenantId),
                            eq(schema.evidenceItems.siteId, targetSiteId), // SCOPED
                            eq(schema.evidenceItems.qsId, qs.id)
                        ) as any
                    )
                    .get();

                const evidenceCount = evidenceCountResult?.count || 0;

                // 4. Count approved evidence items for this QS and SITE
                const approvedEvidenceResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.evidenceItems as any)
                    .where(
                        and(
                            eq(schema.evidenceItems.tenantId, tenantId),
                            eq(schema.evidenceItems.siteId, targetSiteId), // SCOPED
                            eq(schema.evidenceItems.qsId, qs.id),
                            eq(schema.evidenceItems.status, 'approved')
                        ) as any
                    )
                    .get();

                const approvedEvidenceCount = approvedEvidenceResult?.count || 0;

                // 5. Count open actions for this QS and SITE
                const actionsCountResult = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.actions as any)
                    .where(
                        and(
                            eq(schema.actions.tenantId, tenantId),
                            eq(schema.actions.siteId, targetSiteId), // SCOPED
                            eq(schema.actions.qsId, qs.id),
                            eq(schema.actions.status, 'open')
                        ) as any
                    )
                    .get();

                const actionsCount = actionsCountResult?.count || 0;

                // 7. Fetch Local Controls for this QS and SITE
                const relevantControls = await db.query.localControls.findMany({
                    where: and(
                        eq(schema.localControls.tenantId, tenantId),
                        eq(schema.localControls.siteId, targetSiteId), // SCOPED
                        eq(schema.localControls.qsId, qs.id),
                        eq(schema.localControls.active, true)
                    )
                });

                // 8. Fetch distinct localControlIds that have APPROVED evidence for this SITE
                const approvedControlIds = new Set<string>();
                if (relevantControls.length > 0) {
                    const approvedEvidence = await db
                        .select({ localControlId: schema.evidenceItems.localControlId })
                        .from(schema.evidenceItems as any)
                        .where(
                            and(
                                eq(schema.evidenceItems.tenantId, tenantId),
                                eq(schema.evidenceItems.siteId, targetSiteId), // SCOPED
                                eq(schema.evidenceItems.qsId, qs.id),
                                eq(schema.evidenceItems.status, 'approved')
                            ) as any
                        );

                    approvedEvidence.forEach(e => {
                        if (e.localControlId) approvedControlIds.add(e.localControlId);
                    });
                }

                // REVISED SCORING LOGIC
                const controlsWithEvidence = relevantControls.filter(c => approvedControlIds.has(c.id)).length;
                const totalControls = relevantControls.length;

                let completionPercentage = 0;
                let status: 'complete' | 'in-progress' | 'needs-attention' = 'needs-attention';

                if (totalControls > 0) {
                    completionPercentage = Math.round((controlsWithEvidence / totalControls) * 100);
                    if (completionPercentage === 100) status = 'complete';
                    else if (completionPercentage > 0) status = 'in-progress';
                    else {
                        if (evidenceCount > 0) {
                            status = 'in-progress';
                        } else {
                            status = 'needs-attention';
                        }
                    }
                } else {
                    if (approvedEvidenceCount > 0 && actionsCount === 0) {
                        completionPercentage = 100;
                        status = 'complete';
                    } else if (evidenceCount > 0 || actionsCount > 0) {
                        completionPercentage = 50;
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
                    controlsMet: controlsWithEvidence,
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
