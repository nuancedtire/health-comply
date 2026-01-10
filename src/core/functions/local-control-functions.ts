import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";

import { eq, and } from "drizzle-orm";

// Define the Starter Pack Data
const STARTER_PACK = [
    // === SAFE ===
    {
        qsId: 'safe.infection_control',
        title: 'IPC Annual Statement',
        frequencyType: 'recurring',
        frequencyDays: 365,
        defaultReviewerRole: 'Nurse Lead',
        evidenceHint: 'A formal report summarising IPC audits, outbreaks, and training compliance, signed by the IPC Lead.'
    },
    {
        qsId: 'safe.infection_control',
        title: 'Hand Hygiene Audit',
        frequencyType: 'recurring',
        frequencyDays: 90,
        defaultReviewerRole: 'Nurse Lead',
        evidenceHint: 'Completed audit sheets observing clinical and non-clinical staff hand-washing techniques.'
    },
    {
        qsId: 'safe.infection_control',
        title: 'Cleaning Schedule & Logs',
        frequencyType: 'recurring',
        frequencyDays: 30,
        defaultReviewerRole: 'Nurse Lead',
        evidenceHint: 'Scanned sign-off sheets from the cleaning team confirming daily cleaning.'
    },
    {
        qsId: 'safe.infection_control',
        title: 'Deep Clean Certificate',
        frequencyType: 'recurring',
        frequencyDays: 365,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Certificate/Invoice from external cleaning company confirming deep clean.'
    },
    {
        qsId: 'safe.infection_control',
        title: 'Legionella Risk Assessment',
        frequencyType: 'recurring',
        frequencyDays: 730, // 2 years
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Professional risk assessment report of the water system.'
    },
    {
        qsId: 'safe.infection_control',
        title: 'Water Temperature Checks',
        frequencyType: 'recurring',
        frequencyDays: 30,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Log sheet showing sentinel tap temperatures (Hot >50°C, Cold <20°C).'
    },
    {
        qsId: 'safe.infection_control',
        title: 'Sharps Bin Audit',
        frequencyType: 'recurring',
        frequencyDays: 90,
        defaultReviewerRole: 'Nurse Lead',
        evidenceHint: 'Audit checking that sharps bins are not overfilled and labeled correctly.'
    },
    // Safeguarding
    {
        qsId: 'safe.safeguarding',
        title: 'Safeguarding Training Matrix',
        frequencyType: 'recurring',
        frequencyDays: 30,
        defaultReviewerRole: 'GP Partner',
        evidenceHint: 'Export showing Level 3 compliance for Clinicians and Level 1/2 for admin.'
    },
    {
        qsId: 'safe.safeguarding',
        title: 'Safeguarding Meeting Minutes',
        frequencyType: 'recurring',
        frequencyDays: 90,
        defaultReviewerRole: 'GP Partner',
        evidenceHint: 'Anonymised minutes of practice safeguarding meeting.'
    },
    {
        qsId: 'safe.safeguarding',
        title: 'DBS Check Register',
        frequencyType: 'recurring',
        frequencyDays: 30, // Ongoing check really, but monthly review good
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Spreadsheet listing all staff DBS numbers and issue dates.'
    },
    // Medicines
    {
        qsId: 'safe.medicines',
        title: 'Vaccine Fridge Temperatures',
        frequencyType: 'recurring',
        frequencyDays: 30,
        defaultReviewerRole: 'Nurse Lead',
        evidenceHint: 'Data logger download or scanned manual log sheets.'
    },
    {
        qsId: 'safe.medicines',
        title: 'Cold Chain Policy Review',
        frequencyType: 'recurring',
        frequencyDays: 365,
        defaultReviewerRole: 'Nurse Lead',
        evidenceHint: 'The practice specific Cold Chain policy reviewed in last 12 months.'
    },
    {
        qsId: 'safe.medicines',
        title: 'Emergency Drugs Check',
        frequencyType: 'recurring',
        frequencyDays: 7, // Weekly
        defaultReviewerRole: 'Nurse Lead',
        evidenceHint: 'Log sheet showing weekly checks of oxygen, defib, and emergency drugs.'
    },
    // Environments
    {
        qsId: 'safe.safety', // mapped to safe environments usually or safe.safety
        title: 'Fire Risk Assessment',
        frequencyType: 'recurring',
        frequencyDays: 365,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Professional fire risk assessment report.'
    },
    {
        qsId: 'safe.safety',
        title: 'Health & Safety Walkaround',
        frequencyType: 'recurring',
        frequencyDays: 90,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Checklist completed identifying hazards.'
    },
    // Recruitment
    {
        qsId: 'safe.recruitment', // usually safe.safe_staffing or similar
        title: 'Recruitment File Audit',
        frequencyType: 'recurring',
        frequencyDays: 90,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Dip test of 3 random staff files for references/ID.'
    },

    // === EFFECTIVE ===
    {
        qsId: 'effective.evidence_based',
        title: 'Two-Cycle Clinical Audit',
        frequencyType: 'recurring',
        frequencyDays: 365,
        defaultReviewerRole: 'GP Partner',
        evidenceHint: 'Completed audit cycle (Cycle 1 -> Change -> Cycle 2) showing improvement.'
    },

    // === WELL-LED ===
    {
        qsId: 'well_led.governance',
        title: 'Policies & Procedures Review Log',
        frequencyType: 'recurring',
        frequencyDays: 30,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Report showing policies within review date.'
    },
    {
        qsId: 'well_led.governance',
        title: 'Business Continuity Plan',
        frequencyType: 'recurring',
        frequencyDays: 365,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'BCP document updated with current staff details.'
    },
    {
        qsId: 'well_led.governance', // shared direction / learning
        title: 'Significant Event (SEA) Log',
        frequencyType: 'recurring',
        frequencyDays: 90,
        defaultReviewerRole: 'Practice Manager',
        evidenceHint: 'Log of SEAs including dates and closure status.'
    }
];

// Fallback mapping if QS IDs don't match exactly what's in DB
// I'll assume standard IDs for now, but user might need to adjust or generic 'safe'
const QS_MAP: Record<string, string> = {
    'safe.safety': 'safe.safe_environments', // Example adjustment
    'safe.recruitment': 'safe.fit_and_proper',
    'safe.medicines': 'safe.medicines',
    'safe.infection_control': 'safe.infection_prevention',
    'safe.safeguarding': 'safe.safeguarding',
    'effective.evidence_based': 'effective.evidence_based_care',
    'well_led.governance': 'well_led.governance_management'
};

export const seedLocalControlsFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => {
        return z.object({
            siteId: z.string().optional()
        }).optional().parse(data);
    })
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId as string;

        if (!tenantId) throw new Error("Tenant ID required");

        // We need a siteId. Use the passed one, or fallback to user context, or fetch first.
        let siteId = ctx.data?.siteId || (user as any).siteId;

        if (!siteId) {
            const firstSite = await db.query.sites.findFirst({
                where: eq(schema.sites.tenantId, tenantId)
            });
            if (firstSite) siteId = firstSite.id;
        }

        if (!siteId) throw new Error("No site found for this tenant to seed controls into.");

        // 0. Ensure Evidence Categories Exist (Vital for Uploads)
        const evidenceCategories = [
            { id: 'peoples_experience', title: "People's experience of health and care services" },
            { id: 'staff_feedback', title: 'Feedback from staff and leaders' },
            { id: 'partner_feedback', title: 'Feedback from partners' },
            { id: 'observation', title: 'Observation' },
            { id: 'processes', title: 'Processes' },
            { id: 'outcomes', title: 'Outcomes' },
        ];

        for (const cat of evidenceCategories) {
            await db.insert(schema.evidenceCategories).values(cat).onConflictDoNothing();
        }
        console.log("Ensured Evidence Categories exist.");

        let seededCount = 0;

        for (const item of STARTER_PACK) {
            // Map QS ID if needed
            let targetQsId = QS_MAP[item.qsId] || item.qsId;

            // Check if QS exists (to avoid FK errors)
            let qs = await db.query.cqcQualityStatements.findFirst({
                where: eq(schema.cqcQualityStatements.id, targetQsId)
            });

            if (!qs) {
                console.log(`QS ${targetQsId} not found. Creating it...`);
                // Parse "safe.infection_prevention" -> kq="safe", code="infection_prevention"
                const [kqId, code] = targetQsId.split('.');

                if (!kqId || !code) {
                    console.warn(`Skipping control ${item.title} because QS ID ${targetQsId} is invalid format.`);
                    continue;
                }

                // Ensure Key Question exists
                const kq = await db.query.cqcKeyQuestions.findFirst({
                    where: eq(schema.cqcKeyQuestions.id, kqId)
                });

                if (!kq) {
                    // Create KQ if missing (Capitalize first letter for title)
                    const kqTitle = kqId.charAt(0).toUpperCase() + kqId.slice(1);
                    await db.insert(schema.cqcKeyQuestions).values({
                        id: kqId,
                        title: kqTitle,
                        displayOrder: 99
                    }).onConflictDoNothing();
                }

                // Create Quality Statement
                // We need a proper title. For now, prettify the slug.
                const qsTitle = code.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                await db.insert(schema.cqcQualityStatements).values({
                    id: targetQsId,
                    keyQuestionId: kqId,
                    code: code,
                    title: qsTitle,
                    displayOrder: 99,
                    active: 1
                });

                console.log(`Created QS: ${targetQsId}`);
            }

            // Check if control already exists
            const existing = await db.query.localControls.findFirst({
                where: and(
                    eq(schema.localControls.tenantId, tenantId),
                    eq(schema.localControls.siteId, siteId),
                    eq(schema.localControls.title, item.title)
                )
            });

            if (!existing) {
                await db.insert(schema.localControls).values({
                    id: `lc_${crypto.randomUUID()}`,
                    tenantId,
                    siteId,
                    qsId: targetQsId,
                    title: item.title,
                    description: `Standard control for ${item.title}`,
                    evidenceHint: item.evidenceHint,
                    frequencyType: item.frequencyType as any,
                    frequencyDays: item.frequencyDays,
                    defaultReviewerRole: item.defaultReviewerRole,
                    createdAt: new Date(),
                    active: true
                });
                seededCount++;
            }
        }

        return { success: true, seeded: seededCount };
    });

export const getLocalControlsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        qsId: z.string().optional(),
        siteId: z.string().optional()
    }).optional().parse(data))
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId as string;
        const qsId = ctx.data?.qsId;
        const inputSiteId = ctx.data?.siteId;

        // Use passed siteId if available, otherwise try to find one
        let siteId = inputSiteId;

        if (!siteId) {
            // Logic to get siteId from headers/cookie/context if strictly scoped? 
            // For now let's just use the first site if not present, knowing our MVP limits.
            const firstSite = await db.query.sites.findFirst({
                where: eq(schema.sites.tenantId, tenantId!)
            });
            siteId = firstSite?.id;
        }

        if (!tenantId || !siteId) return { controls: [] };

        const whereClause = and(
            eq(schema.localControls.tenantId, tenantId),
            eq(schema.localControls.siteId, siteId),
            qsId ? eq(schema.localControls.qsId, qsId) : undefined
        );

        const controls = await db.query.localControls.findMany({
            where: whereClause,
            with: { qs: true }
        });


        return { controls };
    });

export const suggestLocalControlsFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: { qsId: string }) => data)
    .handler(async (ctx) => {
        const { qsId } = ctx.data;
        const { env } = ctx.context;
        // Cast env to have AI
        const ai = (env as any).AI;

        if (!ai) {
            return { suggestions: [], error: "AI binding not available" };
        }
        const systemPrompt = `
            You are an expert UK CQC Consultant for GP Practices.
            Your job is to suggest "Local Controls" (recurring audits, risk assessments, checks) for a specific CQC Quality Statement.
            
            Format your response as a JSON object:
            {
                "suggestions": [
                    {
                        "title": "Control Name",
                        "description": "Brief description",
                        "frequencyType": "recurring",
                        "frequencyDays": 30,
                        "evidenceHint": "What document to upload",
                        "defaultReviewerRole": "Practice Manager" (or Nurse Lead, GP Partner)
                    }
                ] // Max 3 suggestions
            }
        `;

        const userMessage = `Suggest 3 specific local operational controls for CQC Quality Statement: ${qsId}. Focus on practical evidence items.`;

        try {
            const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        type: "object",
                        properties: {
                            suggestions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        title: { type: "string" },
                                        description: { type: "string" },
                                        frequencyType: { type: "string" },
                                        frequencyDays: { type: "number" },
                                        evidenceHint: { type: "string" },
                                        defaultReviewerRole: { type: "string" }
                                    },
                                    required: ["title", "frequencyDays", "evidenceHint"]
                                }
                            }
                        },
                        required: ["suggestions"]
                    }
                }
            });

            let result = response;
            // Handle potentially nested response or string
            if (typeof result === 'string') {
                try { result = JSON.parse(result); } catch (e) { }
            }
            // @ts-ignore
            if (result.response) result = result.response;
            if (typeof result === 'string') {
                try { result = JSON.parse(result); } catch (e) { }
            }

            return { suggestions: result.suggestions || [] };

        } catch (e: any) {
            console.error("AI Suggestion failed", e);
            return { suggestions: [], error: e.message };
        }
    });


export const createLocalControlFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        qsId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        frequencyType: z.enum(['recurring', 'one-off', 'observation', 'feedback', 'process']),
        frequencyDays: z.number().optional(),
        evidenceHint: z.string().optional(),
        defaultReviewerRole: z.string().optional(),
        siteId: z.string().optional() // Optional override, otherwise inferred
    }).parse(data))
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId;

        let siteId = ctx.data.siteId || (user as any).siteId;

        // Fallback site inference if not provided
        if (!siteId) {
            const firstSite = await db.query.sites.findFirst({
                where: eq(schema.sites.tenantId, tenantId)
            });
            siteId = firstSite?.id;
        }

        if (!tenantId || !siteId) throw new Error("Context missing tenant or site");

        // Map QS ID if an alias is used (e.g. safe.infection_control -> safe.infection_prevention)
        const targetQsId = QS_MAP[ctx.data.qsId] || ctx.data.qsId;

        // *** ADDED CHECK: Ensure QS exists ***
        const qsExists = await db.query.cqcQualityStatements.findFirst({
            where: eq(schema.cqcQualityStatements.id, targetQsId)
        });

        if (!qsExists) {
            console.error(`QS Not Found: Input=${ctx.data.qsId}, Target=${targetQsId}`);
            throw new Error(`Quality Statement "${targetQsId}" (mapped from "${ctx.data.qsId}") not found. Please verify the ID.`);
        }
        // *** END ADDED CHECK ***

        const newId = `lc_${crypto.randomUUID()}`;

        try {
            await db.insert(schema.localControls).values({
                id: newId,
                tenantId,
                siteId,
                qsId: targetQsId, // Use the mapped ID
                title: ctx.data.title,
                description: ctx.data.description,
                frequencyType: ctx.data.frequencyType,
                frequencyDays: ctx.data.frequencyDays,
                evidenceHint: ctx.data.evidenceHint,
                defaultReviewerRole: ctx.data.defaultReviewerRole,
                active: true,
                createdAt: new Date()
            });
        } catch (e: any) {
            console.error("Failed to insert local control:", e);
            throw new Error(`Failed to save control: ${e.message}`);
        }

        return { success: true, id: newId };
    });

export const updateLocalControlFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) => z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        frequencyType: z.enum(['recurring', 'one-off', 'observation', 'feedback', 'process']).optional(),
        frequencyDays: z.number().optional(),
        evidenceHint: z.string().optional(),
        defaultReviewerRole: z.string().optional(),
        active: z.boolean().optional()
    }).parse(data))
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId;

        await db.update(schema.localControls)
            .set({
                ...ctx.data,
                // Make sure we don't update ID or tenant/site
            })
            .where(
                and(
                    eq(schema.localControls.id, ctx.data.id),
                    eq(schema.localControls.tenantId, tenantId)
                )
            );

        return { success: true };
    });

export const deleteLocalControlFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: { id: string }) => data)
    .handler(async (ctx) => {
        const { db, user } = ctx.context;
        const tenantId = (user as any).tenantId;

        await db.delete(schema.localControls)
            .where(
                and(
                    eq(schema.localControls.id, ctx.data.id),
                    eq(schema.localControls.tenantId, tenantId)
                )
            );

        return { success: true };
    });

