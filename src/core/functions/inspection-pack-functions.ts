import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";
import type {
    PackScopeType,
    InspectionPackListItem,
    InspectionPackDetail,
    EvidenceGap,
    KeyQuestionSummary,
    QualityStatementSummary,
} from "@/types/inspection-pack";

// Server function base with auth middleware
const baseFunction = createServerFn().middleware([authMiddleware]);

/**
 * Create a new inspection pack and trigger the background workflow
 */
export const createInspectionPackFn = baseFunction
    .inputValidator((data: unknown) => z.object({
        siteId: z.string(),
        scopeType: z.enum(['full_site', 'key_question', 'quality_statements']),
        scopeData: z.array(z.string()).nullable().optional(),
    }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, env, user } = context;
        const tenantId = (user as any).tenantId;

        if (!tenantId) {
            throw new Error("No tenant associated with user");
        }

        // Verify site belongs to tenant
        const site = await db.query.sites.findFirst({
            where: and(
                eq(schema.sites.id, data.siteId),
                eq(schema.sites.tenantId, tenantId)
            )
        });

        if (!site) {
            throw new Error("Site not found");
        }

        // For key_question scope, resolve to QS IDs
        let normalizedScopeData: string[] | null = null;
        if (data.scopeType === 'key_question' && data.scopeData && data.scopeData.length > 0) {
            const keyQuestionId = data.scopeData[0];
            const qsForKQ = await db.select({ id: schema.cqcQualityStatements.id })
                .from(schema.cqcQualityStatements)
                .where(eq(schema.cqcQualityStatements.keyQuestionId, keyQuestionId));
            normalizedScopeData = qsForKQ.map(qs => qs.id);
        } else if (data.scopeType === 'quality_statements' && data.scopeData) {
            normalizedScopeData = data.scopeData;
        }
        // For full_site, scopeData stays null (means all QS)

        // Generate pack ID
        const packId = `pk_${crypto.randomUUID()}`;

        // Insert the pack record
        await db.insert(schema.inspectionPacks).values({
            id: packId,
            tenantId,
            siteId: data.siteId,
            scopeType: data.scopeType,
            scopeData: normalizedScopeData ? JSON.stringify(normalizedScopeData) : null,
            createdBy: user.id,
            createdAt: new Date(),
            status: 'building',
        });

        // Trigger the background workflow
        if (env.INSPECTION_PACK_WORKFLOW) {
            try {
                await env.INSPECTION_PACK_WORKFLOW.create({
                    id: packId,
                    params: {
                        packId,
                        tenantId,
                        siteId: data.siteId,
                    }
                });
                console.log(`Started inspection pack workflow for ${packId}`);
            } catch (error) {
                console.error(`Failed to start inspection pack workflow:`, error);
                // Update pack status to error
                await db.update(schema.inspectionPacks)
                    .set({ status: 'error' })
                    .where(eq(schema.inspectionPacks.id, packId));
                throw new Error("Failed to start pack generation workflow");
            }
        } else {
            console.warn("INSPECTION_PACK_WORKFLOW not available");
        }

        // Audit log
        await logAuditEvent(db, {
            tenantId,
            actorUserId: user.id,
            action: AUDIT_ACTIONS.PACK_CREATED,
            entityType: "inspection_pack",
            entityId: packId,
            details: {
                metadata: {
                    scopeType: data.scopeType,
                    siteId: data.siteId,
                }
            },
        });

        return { id: packId, status: 'building' };
    });

/**
 * Get list of inspection packs for a site
 */
export const getInspectionPacksFn = baseFunction
    .inputValidator((data: unknown) => z.object({
        siteId: z.string(),
    }).parse(data))
    .handler(async ({ context, data }): Promise<InspectionPackListItem[]> => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;

        if (!tenantId) {
            return [];
        }

        const packs = await db.select({
            id: schema.inspectionPacks.id,
            siteId: schema.inspectionPacks.siteId,
            scopeType: schema.inspectionPacks.scopeType,
            scopeData: schema.inspectionPacks.scopeData,
            status: schema.inspectionPacks.status,
            createdBy: schema.inspectionPacks.createdBy,
            createdAt: schema.inspectionPacks.createdAt,
            siteName: schema.sites.name,
            createdByName: schema.users.name,
        })
            .from(schema.inspectionPacks)
            .leftJoin(schema.sites, eq(schema.inspectionPacks.siteId, schema.sites.id))
            .leftJoin(schema.users, eq(schema.inspectionPacks.createdBy, schema.users.id))
            .where(
                and(
                    eq(schema.inspectionPacks.tenantId, tenantId),
                    eq(schema.inspectionPacks.siteId, data.siteId)
                )
            )
            .orderBy(desc(schema.inspectionPacks.createdAt));

        return packs.map(p => ({
            id: p.id,
            siteId: p.siteId,
            siteName: p.siteName || 'Unknown Site',
            scopeType: p.scopeType as PackScopeType,
            scopeData: p.scopeData ? JSON.parse(p.scopeData) : null,
            status: p.status as any,
            createdBy: p.createdBy,
            createdByName: p.createdByName || undefined,
            createdAt: p.createdAt,
        }));
    });

/**
 * Get detailed information about a single inspection pack
 */
export const getInspectionPackDetailFn = baseFunction
    .inputValidator((data: unknown) => z.object({
        packId: z.string(),
    }).parse(data))
    .handler(async ({ context, data }): Promise<InspectionPackDetail | null> => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;

        if (!tenantId) {
            return null;
        }

        // Fetch pack with related data
        const pack = await db.select({
            id: schema.inspectionPacks.id,
            tenantId: schema.inspectionPacks.tenantId,
            siteId: schema.inspectionPacks.siteId,
            scopeType: schema.inspectionPacks.scopeType,
            scopeData: schema.inspectionPacks.scopeData,
            status: schema.inspectionPacks.status,
            createdBy: schema.inspectionPacks.createdBy,
            createdAt: schema.inspectionPacks.createdAt,
            siteName: schema.sites.name,
            createdByName: schema.users.name,
        })
            .from(schema.inspectionPacks)
            .leftJoin(schema.sites, eq(schema.inspectionPacks.siteId, schema.sites.id))
            .leftJoin(schema.users, eq(schema.inspectionPacks.createdBy, schema.users.id))
            .where(
                and(
                    eq(schema.inspectionPacks.id, data.packId),
                    eq(schema.inspectionPacks.tenantId, tenantId)
                )
            )
            .limit(1);

        if (pack.length === 0) {
            return null;
        }

        const packRecord = pack[0];
        const scopeData = packRecord.scopeData ? JSON.parse(packRecord.scopeData) : null;

        // Fetch outputs
        const outputs = await db.select({
            id: schema.inspectionPackOutputs.id,
            kind: schema.inspectionPackOutputs.kind,
            r2Key: schema.inspectionPackOutputs.r2Key,
            createdAt: schema.inspectionPackOutputs.createdAt,
        })
            .from(schema.inspectionPackOutputs)
            .where(eq(schema.inspectionPackOutputs.packId, data.packId));

        // Determine which QS are in scope
        let qsIds: string[] = [];
        if (scopeData && Array.isArray(scopeData)) {
            qsIds = scopeData;
        } else {
            // Full site - get all QS
            const allQs = await db.select({ id: schema.cqcQualityStatements.id })
                .from(schema.cqcQualityStatements);
            qsIds = allQs.map(qs => qs.id);
        }

        // Fetch controls for scope
        const controls = await db.select({
            id: schema.localControls.id,
            title: schema.localControls.title,
            qsId: schema.localControls.qsId,
            frequencyDays: schema.localControls.frequencyDays,
            lastEvidenceAt: schema.localControls.lastEvidenceAt,
        })
            .from(schema.localControls)
            .where(
                and(
                    eq(schema.localControls.tenantId, tenantId),
                    eq(schema.localControls.siteId, packRecord.siteId),
                    eq(schema.localControls.active, true),
                    qsIds.length > 0 ? inArray(schema.localControls.qsId, qsIds) : undefined
                )
            );

        // Fetch approved evidence for scope
        const evidence = await db.select({
            id: schema.evidenceItems.id,
            qsId: schema.evidenceItems.qsId,
            localControlId: schema.evidenceItems.localControlId,
        })
            .from(schema.evidenceItems)
            .where(
                and(
                    eq(schema.evidenceItems.tenantId, tenantId),
                    eq(schema.evidenceItems.siteId, packRecord.siteId),
                    eq(schema.evidenceItems.status, 'approved'),
                    qsIds.length > 0 ? inArray(schema.evidenceItems.qsId, qsIds) : undefined
                )
            );

        // Calculate gaps
        const now = new Date();
        const gaps: EvidenceGap[] = [];

        for (const control of controls) {
            const controlEvidence = evidence.filter(e => e.localControlId === control.id);

            if (controlEvidence.length === 0) {
                // Missing evidence
                gaps.push({
                    controlId: control.id,
                    controlTitle: control.title,
                    qsId: control.qsId,
                    gapType: 'missing',
                    lastEvidenceDate: control.lastEvidenceAt,
                });
            } else if (control.frequencyDays && control.lastEvidenceAt) {
                const lastDate = new Date(control.lastEvidenceAt);
                const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysSince > control.frequencyDays) {
                    // Outdated
                    gaps.push({
                        controlId: control.id,
                        controlTitle: control.title,
                        qsId: control.qsId,
                        gapType: 'outdated',
                        lastEvidenceDate: control.lastEvidenceAt,
                        daysOverdue: daysSince - control.frequencyDays,
                        frequencyDays: control.frequencyDays,
                    });
                } else if (control.frequencyDays - daysSince <= 30) {
                    // Expiring soon (within 30 days)
                    gaps.push({
                        controlId: control.id,
                        controlTitle: control.title,
                        qsId: control.qsId,
                        gapType: 'expiring_soon',
                        lastEvidenceDate: control.lastEvidenceAt,
                        frequencyDays: control.frequencyDays,
                    });
                }
            }
        }

        // Fetch KQ and QS structure for summaries
        const keyQuestions = await db.select()
            .from(schema.cqcKeyQuestions)
            .orderBy(schema.cqcKeyQuestions.displayOrder);

        const allQualityStatements = await db.select()
            .from(schema.cqcQualityStatements)
            .where(qsIds.length > 0 ? inArray(schema.cqcQualityStatements.id, qsIds) : undefined);

        // Build key question summaries
        const keyQuestionSummaries: KeyQuestionSummary[] = [];

        for (const kq of keyQuestions) {
            const kqQualityStatements = allQualityStatements.filter(qs => qs.keyQuestionId === kq.id);

            if (kqQualityStatements.length === 0) continue;

            const qsSummaries: QualityStatementSummary[] = [];
            let kqEvidenceCount = 0;
            let kqControlCount = 0;
            let kqGapCount = 0;

            for (const qs of kqQualityStatements) {
                const qsControls = controls.filter(c => c.qsId === qs.id);
                const qsEvidence = evidence.filter(e => e.qsId === qs.id);
                const qsGaps = gaps.filter(g => g.qsId === qs.id);

                const controlsWithEvidence = new Set(qsEvidence.map(e => e.localControlId).filter(Boolean));
                const coveragePercentage = qsControls.length > 0
                    ? Math.round((controlsWithEvidence.size / qsControls.length) * 100)
                    : 100;

                qsSummaries.push({
                    id: qs.id,
                    title: qs.title,
                    code: qs.code,
                    controlCount: qsControls.length,
                    evidenceCount: qsEvidence.length,
                    gapCount: qsGaps.length,
                    coveragePercentage,
                });

                kqEvidenceCount += qsEvidence.length;
                kqControlCount += qsControls.length;
                kqGapCount += qsGaps.length;
            }

            const kqControlsWithEvidence = new Set(
                evidence
                    .filter(e => kqQualityStatements.some(qs => qs.id === e.qsId))
                    .map(e => e.localControlId)
                    .filter(Boolean)
            );
            const kqCoveragePercentage = kqControlCount > 0
                ? Math.round((kqControlsWithEvidence.size / kqControlCount) * 100)
                : 100;

            keyQuestionSummaries.push({
                id: kq.id,
                title: kq.title,
                totalEvidence: kqEvidenceCount,
                totalControls: kqControlCount,
                totalGaps: kqGapCount,
                coveragePercentage: kqCoveragePercentage,
                qualityStatements: qsSummaries,
            });
        }

        // Calculate overall stats
        const totalEvidenceCount = evidence.length;
        const totalControlsCount = controls.length;
        const totalGapsCount = gaps.length;
        const controlsWithEvidence = new Set(evidence.map(e => e.localControlId).filter(Boolean));
        const coveragePercentage = totalControlsCount > 0
            ? Math.round((controlsWithEvidence.size / totalControlsCount) * 100)
            : 100;

        return {
            id: packRecord.id,
            tenantId: packRecord.tenantId,
            siteId: packRecord.siteId,
            siteName: packRecord.siteName || 'Unknown Site',
            scopeType: packRecord.scopeType as PackScopeType,
            scopeData,
            status: packRecord.status as any,
            createdBy: packRecord.createdBy,
            createdByName: packRecord.createdByName || undefined,
            createdAt: packRecord.createdAt,
            keyQuestions: keyQuestionSummaries,
            totalEvidenceCount,
            totalControlsCount,
            totalGapsCount,
            coveragePercentage,
            gaps,
            outputs: outputs.map(o => ({
                id: o.id,
                kind: o.kind as any,
                r2Key: o.r2Key,
                createdAt: o.createdAt,
            })),
        };
    });

/**
 * Delete an inspection pack and its R2 outputs
 */
export const deleteInspectionPackFn = baseFunction
    .inputValidator((data: unknown) => z.object({
        packId: z.string(),
    }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, env, user } = context;
        const tenantId = (user as any).tenantId;

        if (!tenantId) {
            throw new Error("No tenant associated with user");
        }

        // Verify pack belongs to tenant
        const pack = await db.query.inspectionPacks.findFirst({
            where: and(
                eq(schema.inspectionPacks.id, data.packId),
                eq(schema.inspectionPacks.tenantId, tenantId)
            )
        });

        if (!pack) {
            throw new Error("Pack not found");
        }

        // Get outputs to delete from R2
        const outputs = await db.select({
            r2Key: schema.inspectionPackOutputs.r2Key,
        })
            .from(schema.inspectionPackOutputs)
            .where(eq(schema.inspectionPackOutputs.packId, data.packId));

        // Delete from R2
        if (env.R2) {
            for (const output of outputs) {
                try {
                    await env.R2.delete(output.r2Key);
                } catch (error) {
                    console.error(`Failed to delete R2 object ${output.r2Key}:`, error);
                }
            }
        }

        // Delete outputs from DB
        await db.delete(schema.inspectionPackOutputs)
            .where(eq(schema.inspectionPackOutputs.packId, data.packId));

        // Delete pack from DB
        await db.delete(schema.inspectionPacks)
            .where(eq(schema.inspectionPacks.id, data.packId));

        // Audit log
        await logAuditEvent(db, {
            tenantId,
            actorUserId: user.id,
            action: AUDIT_ACTIONS.PACK_DELETED,
            entityType: "inspection_pack",
            entityId: data.packId,
        });

        return { success: true };
    });

/**
 * Download a pack output (ZIP or PDF) from R2
 */
export const downloadPackOutputFn = baseFunction
    .inputValidator((data: unknown) => z.object({
        packId: z.string(),
        kind: z.enum(['zip', 'pdf']),
    }).parse(data))
    .handler(async ({ context, data }) => {
        const { db, env, user } = context;
        const tenantId = (user as any).tenantId;

        if (!tenantId) {
            throw new Error("No tenant associated with user");
        }

        // Verify pack belongs to tenant
        const pack = await db.query.inspectionPacks.findFirst({
            where: and(
                eq(schema.inspectionPacks.id, data.packId),
                eq(schema.inspectionPacks.tenantId, tenantId)
            )
        });

        if (!pack) {
            throw new Error("Pack not found");
        }

        // Get the output record
        const output = await db.query.inspectionPackOutputs.findFirst({
            where: and(
                eq(schema.inspectionPackOutputs.packId, data.packId),
                eq(schema.inspectionPackOutputs.kind, data.kind)
            )
        });

        if (!output) {
            throw new Error(`${data.kind.toUpperCase()} output not found`);
        }

        if (!env.R2) {
            throw new Error("R2 storage not configured");
        }

        const object = await env.R2.get(output.r2Key);

        if (!object) {
            throw new Error("File not found in storage");
        }

        // Audit log
        await logAuditEvent(db, {
            tenantId,
            actorUserId: user.id,
            action: AUDIT_ACTIONS.PACK_DOWNLOADED,
            entityType: "inspection_pack",
            entityId: data.packId,
            details: {
                metadata: { kind: data.kind }
            }
        });

        const mimeType = data.kind === 'zip' ? 'application/zip' : 'application/pdf';
        const filename = data.kind === 'zip' ? `inspection-pack-${data.packId}.zip` : `inspection-pack-${data.packId}.pdf`;

        const headers = new Headers();
        headers.set("Content-Type", mimeType);
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);

        return new Response(object.body, { headers });
    });

/**
 * Get key questions for pack creation UI
 */
export const getKeyQuestionsForPackFn = baseFunction
    .handler(async ({ context }) => {
        const { db } = context;

        const keyQuestions = await db.select({
            id: schema.cqcKeyQuestions.id,
            title: schema.cqcKeyQuestions.title,
            displayOrder: schema.cqcKeyQuestions.displayOrder,
        })
            .from(schema.cqcKeyQuestions)
            .orderBy(schema.cqcKeyQuestions.displayOrder);

        const qualityStatements = await db.select({
            id: schema.cqcQualityStatements.id,
            title: schema.cqcQualityStatements.title,
            code: schema.cqcQualityStatements.code,
            keyQuestionId: schema.cqcQualityStatements.keyQuestionId,
        })
            .from(schema.cqcQualityStatements)
            .orderBy(schema.cqcQualityStatements.displayOrder);

        return { keyQuestions, qualityStatements };
    });
