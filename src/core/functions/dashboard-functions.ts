import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, and, desc, gte, sql, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";

export const getDashboardStatsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) =>
        z.object({ siteId: z.string() }).parse(data)
    )
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;
        const siteId = data.siteId;

        if (!tenantId) {
            throw new Error("Tenant ID required");
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const reviewerUser = alias(schema.users, "reviewer_user");

        // Run all 4 queries in parallel to minimise D1 round-trips
        const [evidenceLast7Result, pendingResult, recentEvidence, overdueControls] = await Promise.all([
            // 1. Evidence uploaded in the last 7 days
            db
                .select({ count: sql<number>`count(*)` })
                .from(schema.evidenceItems)
                .where(
                    and(
                        eq(schema.evidenceItems.tenantId, tenantId),
                        eq(schema.evidenceItems.siteId, siteId),
                        gte(schema.evidenceItems.uploadedAt, sevenDaysAgo)
                    )
                )
                .get(),

            // 2. Evidence currently pending review
            db
                .select({ count: sql<number>`count(*)` })
                .from(schema.evidenceItems)
                .where(
                    and(
                        eq(schema.evidenceItems.tenantId, tenantId),
                        eq(schema.evidenceItems.siteId, siteId),
                        eq(schema.evidenceItems.status, "pending_review")
                    )
                )
                .get(),

            // 3. 5 most recent evidence items with control / QS / KQ / reviewer context
            db
                .select({
                    id: schema.evidenceItems.id,
                    title: schema.evidenceItems.title,
                    status: schema.evidenceItems.status,
                    uploadedAt: schema.evidenceItems.uploadedAt,
                    evidenceDate: schema.evidenceItems.evidenceDate,
                    evidenceCategoryId: schema.evidenceItems.evidenceCategoryId,
                    localControlTitle: schema.localControls.title,
                    assigneeRole: schema.localControls.defaultReviewerRole,
                    qsTitle: schema.cqcQualityStatements.title,
                    kqTitle: schema.cqcKeyQuestions.title,
                    reviewerName: reviewerUser.name,
                })
                .from(schema.evidenceItems)
                .leftJoin(
                    schema.localControls,
                    eq(schema.evidenceItems.localControlId, schema.localControls.id)
                )
                .leftJoin(
                    schema.cqcQualityStatements,
                    eq(schema.evidenceItems.qsId, schema.cqcQualityStatements.id)
                )
                .leftJoin(
                    schema.cqcKeyQuestions,
                    eq(schema.cqcQualityStatements.keyQuestionId, schema.cqcKeyQuestions.id)
                )
                .leftJoin(
                    reviewerUser,
                    eq(schema.evidenceItems.reviewedBy, reviewerUser.id)
                )
                .where(
                    and(
                        eq(schema.evidenceItems.tenantId, tenantId),
                        eq(schema.evidenceItems.siteId, siteId)
                    )
                )
                .orderBy(desc(schema.evidenceItems.uploadedAt))
                .limit(5),

            // 4. Overdue recurring controls — mirrors the checklist hub logic:
            //    lastEvidenceAt + frequencyDays * 86400 < now (Unix seconds in D1)
            //    nextDueAt DB column is never written; overdue is computed on the fly.
            db
                .select({
                    id: schema.localControls.id,
                    title: schema.localControls.title,
                    lastEvidenceAt: schema.localControls.lastEvidenceAt,
                    frequencyDays: schema.localControls.frequencyDays,
                    qsTitle: schema.cqcQualityStatements.title,
                })
                .from(schema.localControls)
                .leftJoin(
                    schema.cqcQualityStatements,
                    eq(schema.localControls.qsId, schema.cqcQualityStatements.id)
                )
                .where(
                    and(
                        eq(schema.localControls.tenantId, tenantId),
                        eq(schema.localControls.siteId, siteId),
                        eq(schema.localControls.active, true),
                        eq(schema.localControls.frequencyType, "recurring"),
                        isNotNull(schema.localControls.lastEvidenceAt),
                        isNotNull(schema.localControls.frequencyDays),
                        // last_evidence_at (Unix seconds) + frequency_days * 86400 < current Unix seconds
                        sql`${schema.localControls.lastEvidenceAt} + ${schema.localControls.frequencyDays} * 86400 < strftime('%s', 'now')`
                    )
                )
                .limit(10),
        ]);

        // Compute the due date client-consumable: lastEvidenceAt + frequencyDays
        const overdueControlsMapped = overdueControls.map(c => {
            const nextDueAt = c.lastEvidenceAt && c.frequencyDays
                ? new Date(c.lastEvidenceAt.getTime() + c.frequencyDays * 86400 * 1000)
                : null;
            return { id: c.id, title: c.title, nextDueAt, qsTitle: c.qsTitle };
        });

        return {
            evidenceUploadedLast7Days: evidenceLast7Result?.count ?? 0,
            evidencePendingReview: pendingResult?.count ?? 0,
            recentEvidence,
            overdueControls: overdueControlsMapped,
        };
    });
