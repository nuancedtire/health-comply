import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";
import { EVIDENCE_CATEGORIES } from "@/core/data/taxonomy";
import EXTENDED_CONTROLS from "@/core/data/extended_controls.json";
import { logControlEvent, AUDIT_ACTIONS } from "@/lib/audit";

import { eq, and } from "drizzle-orm";

// Fallback mapping if QS IDs don't match exactly what's in DB
const QS_MAP: Record<string, string> = {
  "safe.safety": "safe.safe_environments",
  "safe.recruitment": "safe.fit_and_proper",
  "safe.medicines": "safe.medicines",
  "safe.infection_control": "safe.infection_prevention",
  "safe.safeguarding": "safe.safeguarding",
  "effective.evidence_based": "effective.evidence_based_care",
  "well_led.governance": "well_led.governance_management",
};

export const seedLocalControlsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: unknown) => {
    return z
      .object({
        siteId: z.string().optional(),
      })
      .optional()
      .parse(data);
  })
  .handler(async (ctx) => {
    const { db, user } = ctx.context;
    const tenantId = (user as any).tenantId as string;

    if (!tenantId) throw new Error("Tenant ID required");

    let siteId = ctx.data?.siteId || (user as any).siteId;

    if (!siteId) {
      const firstSite = await db.query.sites.findFirst({
        where: eq(schema.sites.tenantId, tenantId),
      });
      if (firstSite) siteId = firstSite.id;
    }

    if (!siteId)
      throw new Error("No site found for this tenant to seed controls into.");

    // 0. Ensure Evidence Categories Exist
    for (const cat of EVIDENCE_CATEGORIES) {
      await db
        .insert(schema.evidenceCategories)
        .values(cat)
        .onConflictDoNothing();
    }
    console.log("Ensured Evidence Categories exist.");

    let seededCount = 0;

    // Use EXTENDED_CONTROLS instead of STARTER_PACK
    const controlsToSeed = EXTENDED_CONTROLS;

    for (const item of controlsToSeed) {
      // Map QS ID if needed
      let targetQsId = QS_MAP[item.qsId] || item.qsId;

      // Check if QS exists (to avoid FK errors)
      let qs = await db.query.cqcQualityStatements.findFirst({
        where: eq(schema.cqcQualityStatements.id, targetQsId),
      });

      if (!qs) {
        console.log(`QS ${targetQsId} not found. Creating it...`);
        const parts = targetQsId.split(".");
        // Handle cases where split might not give 2 parts if ID is non-standard
        const kqId = parts[0];
        const code = parts[1] || parts[0];

        if (!kqId) {
          console.warn(
            `Skipping control ${item.title} because QS ID ${targetQsId} is invalid format.`,
          );
          continue;
        }

        // Ensure Key Question exists
        const kq = await db.query.cqcKeyQuestions.findFirst({
          where: eq(schema.cqcKeyQuestions.id, kqId),
        });

        if (!kq) {
          const kqTitle = kqId.charAt(0).toUpperCase() + kqId.slice(1);
          await db
            .insert(schema.cqcKeyQuestions)
            .values({
              id: kqId,
              title: kqTitle,
              displayOrder: 99,
            })
            .onConflictDoNothing();
        }

        // Create Quality Statement
        const qsTitle = code
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        await db
          .insert(schema.cqcQualityStatements)
          .values({
            id: targetQsId,
            keyQuestionId: kqId,
            code: code,
            title: qsTitle,
            displayOrder: 99,
            active: 1,
          })
          .onConflictDoNothing();

        console.log(`Created QS: ${targetQsId}`);
      }

      // Check if control already exists
      const existing = await db.query.localControls.findFirst({
        where: and(
          eq(schema.localControls.tenantId, tenantId),
          eq(schema.localControls.siteId, siteId),
          eq(schema.localControls.title, item.title),
        ),
      });

      if (!existing) {
        await db.insert(schema.localControls).values({
          id: `lc_${crypto.randomUUID()}`,
          tenantId,
          siteId,
          qsId: targetQsId,
          title: item.title,
          description: item.description || `Standard control for ${item.title}`,
          evidenceHint: item.evidenceHint,
          frequencyType: item.frequencyType as any,
          frequencyDays: item.frequencyDays,
          defaultReviewerRole: item.defaultReviewerRole,
          fallbackReviewerRole: (item as any).fallbackReviewerRole, // Extended pack might have this
          evidenceExamples: JSON.stringify(
            (item as any).evidenceExamples || {},
          ),
          cqcMythbusterUrl: (item as any).cqcMythbusterUrl,
          createdAt: new Date(),
          active: true,
        });
        seededCount++;
      }
    }

    return { success: true, seeded: seededCount };
  });

export const getLocalControlsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        qsId: z.string().optional(),
        siteId: z.string().optional(),
      })
      .optional()
      .parse(data),
  )
  .handler(async (ctx) => {
    const { db, user } = ctx.context;
    const tenantId = (user as any).tenantId as string;
    const qsId = ctx.data?.qsId;
    const inputSiteId = ctx.data?.siteId;

    let siteId = inputSiteId;

    if (!siteId) {
      const firstSite = await db.query.sites.findFirst({
        where: eq(schema.sites.tenantId, tenantId!),
      });
      siteId = firstSite?.id;
    }

    if (!tenantId || !siteId) return { controls: [] };

    const whereClause = and(
      eq(schema.localControls.tenantId, tenantId),
      eq(schema.localControls.siteId, siteId),
      qsId ? eq(schema.localControls.qsId, qsId) : undefined,
    );

    const controls = await db.query.localControls.findMany({
      where: whereClause,
      with: { qs: true },
    });

    return { controls };
  });

export const suggestLocalControlsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { qsId?: string; siteId?: string }) => data)
  .handler(async (ctx) => {
    const { qsId, siteId: inputSiteId } = ctx.data;
    const { env, db, user } = ctx.context;
    const tenantId = (user as any).tenantId as string;

    const apiKey = (env as any).CEREBRAS_API_KEY;

    if (!apiKey) {
      return { suggestions: [], error: "CEREBRAS_API_KEY not configured" };
    }

    let siteId = inputSiteId || (user as any).siteId;
    if (!siteId) {
      const firstSite = await db.query.sites.findFirst({
        where: eq(schema.sites.tenantId, tenantId),
      });
      siteId = firstSite?.id;
    }

    let existingControls: {
      title: string;
      evidenceHint: string | null;
      qsId: string;
    }[] = [];
    if (siteId && tenantId) {
      const controls = await db.query.localControls.findMany({
        where: and(
          eq(schema.localControls.tenantId, tenantId),
          eq(schema.localControls.siteId, siteId),
        ),
        columns: {
          title: true,
          evidenceHint: true,
          qsId: true,
        },
      });
      existingControls = controls;
    }

    const controlsForThisArea = qsId
      ? existingControls.filter((c) => c.qsId === qsId)
      : [];
    const controlsForOtherAreas = qsId
      ? existingControls.filter((c) => c.qsId !== qsId)
      : existingControls;

    let existingControlsContext = "";
    if (qsId && controlsForThisArea.length > 0) {
      existingControlsContext += `\n\nEXISTING CONTROLS FOR THIS AREA "${qsId}" (do NOT suggest duplicates):\n${controlsForThisArea.map((c, i) => `${i + 1}. "${c.title}"${c.evidenceHint ? ` - Evidence: ${c.evidenceHint}` : ""}`).join("\n")}`;
    }
    if (controlsForOtherAreas.length > 0) {
      existingControlsContext += `\n\nOTHER EXISTING CONTROLS (avoid suggesting similar):\n${controlsForOtherAreas.map((c) => `- "${c.title}" (${c.qsId})`).join("\n")}`;
    }
    if (existingControls.length === 0) {
      existingControlsContext =
        "\n\nNo controls currently exist for this site - suggest foundational controls.";
    }

    const systemPrompt = `You are an expert UK CQC (Care Quality Commission) Consultant specialising in GP Practice compliance.

Your task is to analyse gaps in a practice's Local Controls and suggest NEW controls that are NOT already covered.

CONTEXT:
- Local Controls are recurring audits, risk assessments, checks, or evidence collection tasks
- Each control should map to specific, uploadable evidence
- Focus on practical, actionable items that a UK GP practice can realistically maintain
- Consider CQC inspection requirements and "mythbuster" guidance

ROLES FOR ASSIGNMENT:
- "Practice Manager" - Administrative, governance, HR, facilities
- "Nurse Lead" - Clinical audits, IPC, medicines, patient safety
- "GP Partner" - Clinical governance, safeguarding, significant events

FREQUENCY TYPES:
- "recurring" - Regular schedule (specify frequencyDays: 7=weekly, 30=monthly, 90=quarterly, 365=annually)
- "one-off" - Single task
- "observation" - Ongoing observation-based
- "feedback" - Based on patient/staff feedback collection

You must return EXACTLY 3 suggestions for controls that are GAPS (not already covered).
${existingControlsContext}`;

    let userMessage = ``;
    if (qsId) {
      userMessage = `Analyse the compliance gaps for CQC Quality Statement area: "${qsId}"

Suggest 3 specific local operational controls that would strengthen this practice's evidence portfolio for this specific area. For each suggestion:
1. Identify a genuine gap not covered by existing controls
2. Explain WHY this is important for CQC compliance
3. Provide practical evidence guidance including good and bad examples
4. Assign appropriate priority based on CQC risk`;
    } else {
      userMessage = `Analyse the compliance gaps across ALL areas for a GP practice.

Suggest 3 specific local operational controls that would strengthen this practice's OVERALL evidence portfolio. Choose high-priority areas that are commonly missed. For each suggestion:
1. Identify a genuine gap not covered by existing controls
2. Explain WHY this is important for CQC compliance
3. Provide practical evidence guidance including good and bad examples
4. Assign appropriate priority based on CQC risk`;
    }

    try {
      const response = await fetch(
        "https://api.cerebras.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-oss-120b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "suggestions_response",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: {
                            type: "string",
                            description: "Clear, specific control name",
                          },
                          description: {
                            type: "string",
                            description: "What this control involves",
                          },
                          frequencyType: {
                            type: "string",
                            enum: [
                              "recurring",
                              "one-off",
                              "observation",
                              "feedback",
                            ],
                            description: "How often this should occur",
                          },
                          frequencyDays: {
                            type: "number",
                            description:
                              "Days between occurrences (for recurring)",
                          },
                          evidenceHint: {
                            type: "string",
                            description: "What document/evidence to upload",
                          },
                          defaultReviewerRole: {
                            type: "string",
                            enum: [
                              "Practice Manager",
                              "Nurse Lead",
                              "GP Partner",
                            ],
                            description: "Who should own this control",
                          },
                          fallbackReviewerRole: {
                            type: "string",
                            enum: [
                              "Practice Manager",
                              "Nurse Lead",
                              "GP Partner",
                            ],
                            description:
                              "Backup reviewer if primary unavailable",
                          },
                          evidenceExamples: {
                            type: "object",
                            properties: {
                              good: {
                                type: "array",
                                items: { type: "string" },
                                description:
                                  "Examples of good/acceptable evidence",
                              },
                              bad: {
                                type: "array",
                                items: { type: "string" },
                                description:
                                  "Examples of poor/unacceptable evidence",
                              },
                            },
                            required: ["good", "bad"],
                            additionalProperties: false,
                          },
                          reasoning: {
                            type: "string",
                            description:
                              "Why this is a gap and important for CQC",
                          },
                          priority: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                            description: "Priority based on CQC risk",
                          },
                          confidence: {
                            type: "number",
                            description:
                              "Confidence score 0-100 that this is a genuine gap",
                          },
                        },
                        required: [
                          "title",
                          "description",
                          "frequencyType",
                          "frequencyDays",
                          "evidenceHint",
                          "defaultReviewerRole",
                          "fallbackReviewerRole",
                          "evidenceExamples",
                          "reasoning",
                          "priority",
                          "confidence",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
            temperature: 0.1,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cerebras API Error: ${err}`);
      }

      const json: any = await response.json();
      const content = json.choices?.[0]?.message?.content;
      let result = content;

      if (typeof result === "string") {
        try {
          result = JSON.parse(result);
        } catch (e) {}
      }

      return { suggestions: result.suggestions || [] };
    } catch (e: any) {
      console.error("AI Suggestion failed", e);
      return { suggestions: [], error: e.message };
    }
  });

export const createLocalControlFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        qsId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        frequencyType: z.enum([
          "recurring",
          "one-off",
          "observation",
          "feedback",
          "process",
        ]),
        frequencyDays: z.number().optional(),
        evidenceHint: z.string().optional(),
        defaultReviewerRole: z.string().optional(),
        fallbackReviewerRole: z.string().optional(),
        evidenceExamples: z.string().optional(), // Passed as JSON string
        cqcMythbusterUrl: z.string().optional(),
        siteId: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async (ctx) => {
    const { db, user } = ctx.context;
    const tenantId = (user as any).tenantId;

    // Authorization check
    const userRoles = await db
      .select({ role: schema.userRoles.role, siteId: schema.userRoles.siteId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.id));

    const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer"];
    const isSystemAdmin = (user as any).isSystemAdmin;
    const hasPermission =
      isSystemAdmin || userRoles.some((r) => allowedRoles.includes(r.role));

    if (!hasPermission) {
      throw new Error(
        "Unauthorized: Only Practice Managers, Admins, and Compliance Officers can create controls",
      );
    }

    let siteId = ctx.data.siteId || (user as any).siteId;

    if (!siteId) {
      const firstSite = await db.query.sites.findFirst({
        where: eq(schema.sites.tenantId, tenantId),
      });
      siteId = firstSite?.id;
    }

    if (!tenantId || !siteId) throw new Error("Context missing tenant or site");

    // Check site scope if user has site-scoped role
    const userSiteRole = userRoles.find((r) => r.siteId !== null);
    if (userSiteRole && userSiteRole.siteId !== siteId) {
      throw new Error("Unauthorized: Cannot create controls for other sites");
    }

    const targetQsId = QS_MAP[ctx.data.qsId] || ctx.data.qsId;

    const qsExists = await db.query.cqcQualityStatements.findFirst({
      where: eq(schema.cqcQualityStatements.id, targetQsId),
    });

    if (!qsExists) {
      console.error(
        `QS Not Found: Input=${ctx.data.qsId}, Target=${targetQsId}`,
      );
      throw new Error(
        `Quality Statement "${targetQsId}" (mapped from "${ctx.data.qsId}") not found. Please verify the ID.`,
      );
    }

    const newId = `lc_${crypto.randomUUID()}`;

    try {
      await db.insert(schema.localControls).values({
        id: newId,
        tenantId,
        siteId,
        qsId: targetQsId,
        title: ctx.data.title,
        description: ctx.data.description,
        frequencyType: ctx.data.frequencyType,
        frequencyDays: ctx.data.frequencyDays,
        evidenceHint: ctx.data.evidenceHint,
        defaultReviewerRole: ctx.data.defaultReviewerRole,
        fallbackReviewerRole: ctx.data.fallbackReviewerRole,
        evidenceExamples: ctx.data.evidenceExamples,
        cqcMythbusterUrl: ctx.data.cqcMythbusterUrl,
        active: true,
        createdAt: new Date(),
      });

      // Audit log
      await logControlEvent(db, {
        tenantId,
        actorUserId: user.id,
        controlId: newId,
        action: AUDIT_ACTIONS.CONTROL_CREATED,
        details: {
          controlTitle: ctx.data.title,
          qsId: targetQsId,
        },
      });
    } catch (e: any) {
      console.error("Failed to insert local control:", e);
      throw new Error(`Failed to save control: ${e.message}`);
    }

    return { success: true, id: newId };
  });

export const updateLocalControlFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        frequencyType: z
          .enum(["recurring", "one-off", "observation", "feedback", "process"])
          .optional(),
        frequencyDays: z.number().optional(),
        evidenceHint: z.string().optional(),
        defaultReviewerRole: z.string().optional(),
        fallbackReviewerRole: z.string().optional(),
        evidenceExamples: z.string().optional(),
        cqcMythbusterUrl: z.string().optional(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async (ctx) => {
    const { db, user } = ctx.context;
    const tenantId = (user as any).tenantId;

    // Authorization check
    const userRoles = await db
      .select({ role: schema.userRoles.role, siteId: schema.userRoles.siteId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.id));

    const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer"];
    const isSystemAdmin = (user as any).isSystemAdmin;
    const hasPermission =
      isSystemAdmin || userRoles.some((r) => allowedRoles.includes(r.role));

    if (!hasPermission) {
      throw new Error(
        "Unauthorized: Only Practice Managers, Admins, and Compliance Officers can update controls",
      );
    }

    // Check site scope
    const control = await db.query.localControls.findFirst({
      where: and(
        eq(schema.localControls.id, ctx.data.id),
        eq(schema.localControls.tenantId, tenantId),
      ),
      columns: { siteId: true, title: true },
    });

    if (!control) {
      throw new Error("Control not found");
    }

    const userSiteRole = userRoles.find((r) => r.siteId !== null);
    if (userSiteRole && userSiteRole.siteId !== control.siteId) {
      throw new Error("Unauthorized: Cannot update controls for other sites");
    }

    await db
      .update(schema.localControls)
      .set({
        ...ctx.data,
      })
      .where(
        and(
          eq(schema.localControls.id, ctx.data.id),
          eq(schema.localControls.tenantId, tenantId),
        ),
      );

    // Audit log
    await logControlEvent(db, {
      tenantId,
      actorUserId: user.id,
      controlId: ctx.data.id,
      action: AUDIT_ACTIONS.CONTROL_UPDATED,
      details: {
        controlTitle: ctx.data.title || control.title,
      },
    });

    return { success: true };
  });

export const deleteLocalControlFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { id: string }) => data)
  .handler(async (ctx) => {
    const { db, user } = ctx.context;
    const tenantId = (user as any).tenantId;

    // Authorization check
    const userRoles = await db
      .select({ role: schema.userRoles.role, siteId: schema.userRoles.siteId })
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.id));

    const allowedRoles = ["Practice Manager", "Admin"];
    const isSystemAdmin = (user as any).isSystemAdmin;
    const hasPermission =
      isSystemAdmin || userRoles.some((r) => allowedRoles.includes(r.role));

    if (!hasPermission) {
      throw new Error(
        "Unauthorized: Only Practice Managers and Admins can delete controls",
      );
    }

    // Check site scope and get control info for audit
    const control = await db.query.localControls.findFirst({
      where: and(
        eq(schema.localControls.id, ctx.data.id),
        eq(schema.localControls.tenantId, tenantId),
      ),
      columns: { siteId: true, title: true },
    });

    if (!control) {
      throw new Error("Control not found");
    }

    const userSiteRole = userRoles.find((r) => r.siteId !== null);
    if (userSiteRole && userSiteRole.siteId !== control.siteId) {
      throw new Error("Unauthorized: Cannot delete controls for other sites");
    }

    // Audit log before delete
    await logControlEvent(db, {
      tenantId,
      actorUserId: user.id,
      controlId: ctx.data.id,
      action: AUDIT_ACTIONS.CONTROL_DELETED,
      details: {
        controlTitle: control.title,
      },
    });

    await db
      .delete(schema.localControls)
      .where(
        and(
          eq(schema.localControls.id, ctx.data.id),
          eq(schema.localControls.tenantId, tenantId),
        ),
      );

    return { success: true };
  });

export const generateControlDetailsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: unknown) =>
    z
      .object({
        suggestedTitle: z.string(),
        qsId: z.string(),
        documentContext: z.string().optional(), // Optional: document text that triggered the suggestion
      })
      .parse(data),
  )
  .handler(async (ctx) => {
    const { env, db } = ctx.context;
    const { suggestedTitle, qsId, documentContext } = ctx.data;

    const apiKey = (env as any).CEREBRAS_API_KEY;

    if (!apiKey) {
      // Return sensible defaults if no API key
      return {
        title: suggestedTitle,
        description: `Control for ${suggestedTitle}`,
        frequencyType: "recurring" as const,
        frequencyDays: 90,
        evidenceHint: "Upload relevant documentation",
        defaultReviewerRole: "Practice Manager",
        fallbackReviewerRole: "Admin",
        evidenceExamples: {
          good: ["Completed audit form with date and signature"],
          bad: ["Undated or unsigned documents"],
        },
      };
    }

    // Fetch QS title for context
    const qs = await db.query.cqcQualityStatements.findFirst({
      where: eq(schema.cqcQualityStatements.id, qsId),
      with: { keyQuestion: true },
    });

    const systemPrompt = `You are an expert UK CQC (Care Quality Commission) Consultant specialising in GP Practice compliance.

Your task is to generate complete details for a new Local Control based on a suggested title.

CONTEXT:
- Local Controls are recurring audits, risk assessments, checks, or evidence collection tasks
- Each control should map to specific, uploadable evidence
- Focus on practical, actionable items that a UK GP practice can realistically maintain
- Consider CQC inspection requirements and "mythbuster" guidance

QUALITY STATEMENT CONTEXT:
- QS ID: ${qsId}
- QS Title: ${qs?.title || "Unknown"}
- Key Question: ${(qs as any)?.keyQuestion?.title || "Unknown"}

ROLES FOR ASSIGNMENT:
- "Practice Manager" - Administrative, governance, HR, facilities
- "Nurse Lead" - Clinical audits, IPC, medicines, patient safety
- "GP Partner" - Clinical governance, safeguarding, significant events

FREQUENCY TYPES:
- "recurring" - Regular schedule (specify frequencyDays: 7=weekly, 30=monthly, 90=quarterly, 365=annually)
- "one-off" - Single task
- "observation" - Ongoing observation-based
- "feedback" - Based on patient/staff feedback collection

Generate complete control details for the suggested title. Make them specific, actionable, and aligned with CQC requirements.`;

    const userMessage = `Generate complete details for this control:
Title: "${suggestedTitle}"

${documentContext ? `DOCUMENT CONTEXT (evidence that triggered this suggestion):\n${documentContext.slice(0, 2000)}\n` : ""}

Generate all fields needed for a complete control definition.`;

    try {
      const response = await fetch(
        "https://api.cerebras.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-oss-120b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "control_details",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description:
                        "Refined control title (keep similar to suggested)",
                    },
                    description: {
                      type: "string",
                      description:
                        "Detailed description of what this control involves",
                    },
                    frequencyType: {
                      type: "string",
                      enum: ["recurring", "one-off", "observation", "feedback"],
                      description: "How often this should occur",
                    },
                    frequencyDays: {
                      type: "number",
                      description: "Days between occurrences (for recurring)",
                    },
                    evidenceHint: {
                      type: "string",
                      description: "What document/evidence to upload",
                    },
                    defaultReviewerRole: {
                      type: "string",
                      enum: ["Practice Manager", "Nurse Lead", "GP Partner"],
                      description: "Who should own this control",
                    },
                    fallbackReviewerRole: {
                      type: "string",
                      enum: ["Practice Manager", "Nurse Lead", "GP Partner"],
                      description: "Backup reviewer if primary unavailable",
                    },
                    evidenceExamples: {
                      type: "object",
                      properties: {
                        good: {
                          type: "array",
                          items: { type: "string" },
                          description: "Examples of good/acceptable evidence",
                        },
                        bad: {
                          type: "array",
                          items: { type: "string" },
                          description: "Examples of poor/unacceptable evidence",
                        },
                      },
                      required: ["good", "bad"],
                      additionalProperties: false,
                    },
                  },
                  required: [
                    "title",
                    "description",
                    "frequencyType",
                    "frequencyDays",
                    "evidenceHint",
                    "defaultReviewerRole",
                    "fallbackReviewerRole",
                    "evidenceExamples",
                  ],
                  additionalProperties: false,
                },
              },
            },
            temperature: 0.2,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Cerebras API Error: ${err}`);
      }

      const json: any = await response.json();
      const content = json.choices?.[0]?.message?.content;
      let result = content;

      if (typeof result === "string") {
        try {
          result = JSON.parse(result);
        } catch (e) {}
      }

      return result;
    } catch (e: any) {
      console.error("AI Control generation failed", e);
      // Return defaults on error
      return {
        title: suggestedTitle,
        description: `Control for ${suggestedTitle}`,
        frequencyType: "recurring" as const,
        frequencyDays: 90,
        evidenceHint: "Upload relevant documentation",
        defaultReviewerRole: "Practice Manager",
        fallbackReviewerRole: "Admin",
        evidenceExamples: {
          good: ["Completed audit form with date and signature"],
          bad: ["Undated or unsigned documents"],
        },
      };
    }
  });

export const getQualityStatementsFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { db } = ctx.context;

    // Fetch all active QS, maybe ordered by Key Question and Display Order
    const qsList = await db.query.cqcQualityStatements.findMany({
      where: eq(schema.cqcQualityStatements.active, 1),
      orderBy: (qs, { asc }) => [asc(qs.keyQuestionId), asc(qs.displayOrder)],
      with: {
        keyQuestion: true, // Assuming relation exists or we can infer title from ID
      },
    });

    // Group by Key Question for UI convenience
    // But simply returning flat list with Key Question Title is good enough for Select components
    // We need to fetch Key Questions to get their titles if 'keyQuestion' relation isn't auto-fetched or defined
    // Looking at schema.ts, cqcQualityStatements has keyQuestionId.
    // Let's check relations. cqcQualityStatements doesn't have an explicit 'keyQuestion' relation defined in schema.ts relations block?
    // Wait, line 21 says: keyQuestionId: text('key_question_id').notNull().references(() => cqcKeyQuestions.id),
    // But relations block doesn't define 'keyQuestion'.
    // Let's just fetch Key Questions separately or use the ID.
    // Better: Fetch Key Questions too.

    const keyQuestions = await db.query.cqcKeyQuestions.findMany({
      orderBy: (kq, { asc }) => [asc(kq.displayOrder)],
    });

    const kqMap = new Map(keyQuestions.map((kq) => [kq.id, kq.title]));

    return {
      qualityStatements: qsList.map((qs) => ({
        id: qs.id,
        title: qs.title,
        code: qs.code,
        keyQuestionId: qs.keyQuestionId,
        keyQuestionTitle: kqMap.get(qs.keyQuestionId) || qs.keyQuestionId,
      })),
    };
  });
