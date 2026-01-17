import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";
import EXTENDED_CONTROLS from "@/core/data/extended_controls.json";
import { eq, and } from "drizzle-orm";

export interface ControlPackItem {
    packId: string;
    packName: string;
    packIcon: string;
    keyQuestion: string;
    qsId: string;
    title: string;
    description: string;
    evidenceHint: string;
    frequencyType: string;
    frequencyDays: number;
    defaultReviewerRole: string;
    evidenceExamples: {
        good: string[];
        bad: string[];
    };
    cqcMythbusterUrl: string;
}

export interface ControlPack {
    packId: string;
    packName: string;
    packIcon: string;
    keyQuestion: string;
    controlCount: number;
    controls: ControlPackItem[];
}

const KEY_QUESTION_ORDER: Record<string, number> = {
    'safe': 1,
    'effective': 2,
    'caring': 3,
    'responsive': 4,
    'well_led': 5
};

const KEY_QUESTION_LABELS: Record<string, string> = {
    'safe': 'Safe',
    'effective': 'Effective',
    'caring': 'Caring',
    'responsive': 'Responsive',
    'well_led': 'Well-Led'
};

export const getControlPacksFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async () => {
        const controls = EXTENDED_CONTROLS as ControlPackItem[];
        
        const packMap = new Map<string, ControlPack>();
        
        for (const control of controls) {
            if (!packMap.has(control.packId)) {
                packMap.set(control.packId, {
                    packId: control.packId,
                    packName: control.packName,
                    packIcon: control.packIcon,
                    keyQuestion: control.keyQuestion,
                    controlCount: 0,
                    controls: []
                });
            }
            
            const pack = packMap.get(control.packId)!;
            pack.controls.push(control);
            pack.controlCount = pack.controls.length;
        }
        
        const packs = Array.from(packMap.values());
        
        packs.sort((a, b) => {
            const orderA = KEY_QUESTION_ORDER[a.keyQuestion] || 99;
            const orderB = KEY_QUESTION_ORDER[b.keyQuestion] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.packName.localeCompare(b.packName);
        });
        
        const groupedByKQ: Record<string, { label: string; packs: ControlPack[] }> = {};
        
        for (const pack of packs) {
            const kq = pack.keyQuestion;
            if (!groupedByKQ[kq]) {
                groupedByKQ[kq] = {
                    label: KEY_QUESTION_LABELS[kq] || kq,
                    packs: []
                };
            }
            groupedByKQ[kq].packs.push(pack);
        }
        
        const sortedGroups = Object.entries(groupedByKQ)
            .sort(([a], [b]) => (KEY_QUESTION_ORDER[a] || 99) - (KEY_QUESTION_ORDER[b] || 99))
            .map(([kq, data]) => ({
                keyQuestion: kq,
                label: data.label,
                packs: data.packs
            }));
        
        return { groups: sortedGroups, totalPacks: packs.length, totalControls: controls.length };
    });

export const getPackControlsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        packId: z.string()
    }).parse(data))
    .handler(async (ctx) => {
        const { packId } = ctx.data;
        const controls = EXTENDED_CONTROLS as ControlPackItem[];
        
        const packControls = controls.filter(c => c.packId === packId);
        
        if (packControls.length === 0) {
            return { controls: [], packName: '', packIcon: '' };
        }
        
        return {
            controls: packControls,
            packName: packControls[0].packName,
            packIcon: packControls[0].packIcon
        };
    });

export const importControlPackFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        packId: z.string(),
        controlTitles: z.array(z.string()),
        siteId: z.string().optional()
    }).parse(data))
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId as string;
        const { packId, controlTitles } = ctx.data;

        if (!tenantId) throw new Error("Tenant ID required");

        let siteId = ctx.data.siteId || (user as any).siteId;

        if (!siteId) {
            const firstSite = await db.query.sites.findFirst({
                where: eq(schema.sites.tenantId, tenantId)
            });
            if (firstSite) siteId = firstSite.id;
        }

        if (!siteId) throw new Error("No site found for this tenant");

        const allControls = EXTENDED_CONTROLS as ControlPackItem[];
        const packControls = allControls.filter(c => c.packId === packId);
        
        const selectedControls = controlTitles.length > 0
            ? packControls.filter(c => controlTitles.includes(c.title))
            : packControls;

        let importedCount = 0;
        let skippedCount = 0;

        for (const control of selectedControls) {
            let targetQsId = control.qsId;

            const qs = await db.query.cqcQualityStatements.findFirst({
                where: eq(schema.cqcQualityStatements.id, targetQsId)
            });

            if (!qs) {
                const parts = targetQsId.split('.');
                const kqId = parts[0];
                const code = parts[1];

                if (!kqId || !code) continue;

                const kq = await db.query.cqcKeyQuestions.findFirst({
                    where: eq(schema.cqcKeyQuestions.id, kqId)
                });

                if (!kq) {
                    const kqTitle = kqId.charAt(0).toUpperCase() + kqId.slice(1);
                    await db.insert(schema.cqcKeyQuestions).values({
                        id: kqId,
                        title: kqTitle,
                        displayOrder: 99
                    }).onConflictDoNothing();
                }

                const qsTitle = code.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                await db.insert(schema.cqcQualityStatements).values({
                    id: targetQsId,
                    keyQuestionId: kqId,
                    code: code,
                    title: qsTitle,
                    displayOrder: 99,
                    active: 1
                }).onConflictDoNothing();
            }

            const existing = await db.query.localControls.findFirst({
                where: and(
                    eq(schema.localControls.tenantId, tenantId),
                    eq(schema.localControls.siteId, siteId),
                    eq(schema.localControls.title, control.title)
                )
            });

            if (existing) {
                skippedCount++;
                continue;
            }

            const now = new Date();
            const nextDue = new Date(now.getTime() + (control.frequencyDays * 24 * 60 * 60 * 1000));

            await db.insert(schema.localControls).values({
                id: `lc_${crypto.randomUUID()}`,
                tenantId,
                siteId,
                qsId: targetQsId,
                title: control.title,
                description: control.description,
                evidenceHint: control.evidenceHint,
                frequencyType: control.frequencyType as any,
                frequencyDays: control.frequencyDays,
                defaultReviewerRole: control.defaultReviewerRole,
                nextDueAt: nextDue,
                sourcePackId: packId,
                evidenceExamples: JSON.stringify(control.evidenceExamples),
                cqcMythbusterUrl: control.cqcMythbusterUrl,
                createdAt: now,
                active: true
            });

            importedCount++;
        }

        return { 
            success: true, 
            imported: importedCount, 
            skipped: skippedCount,
            message: `Imported ${importedCount} controls${skippedCount > 0 ? `, skipped ${skippedCount} duplicates` : ''}`
        };
    });

export const getImportedPacksFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        siteId: z.string().optional()
    }).optional().parse(data))
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId as string;
        
        let siteId = ctx.data?.siteId || (user as any).siteId;

        if (!siteId) {
            const firstSite = await db.query.sites.findFirst({
                where: eq(schema.sites.tenantId, tenantId!)
            });
            siteId = firstSite?.id;
        }

        if (!tenantId || !siteId) return { importedPacks: [] };

        const controls = await db.query.localControls.findMany({
            where: and(
                eq(schema.localControls.tenantId, tenantId),
                eq(schema.localControls.siteId, siteId),
                eq(schema.localControls.active, true)
            )
        });

        const packCounts = new Map<string, number>();
        for (const control of controls) {
            if (control.sourcePackId) {
                packCounts.set(control.sourcePackId, (packCounts.get(control.sourcePackId) || 0) + 1);
            }
        }

        return { 
            importedPacks: Array.from(packCounts.entries()).map(([packId, count]) => ({ packId, count }))
        };
    });
