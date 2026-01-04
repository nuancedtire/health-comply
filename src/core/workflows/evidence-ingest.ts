import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';

type Env = {
    R2: R2Bucket;
    AI: any;
    DB: D1Database;
    EVIDENCE_INGEST_WORKFLOW: Workflow;
};

type EvidenceIngestParams = {
    evidenceId: string;
    fileContext?: {
        filename: string;
        mimeType: string;
    }
};

export class EvidenceIngestWorkflow extends WorkflowEntrypoint<Env, EvidenceIngestParams> {
    async run(event: WorkflowEvent<EvidenceIngestParams>, step: WorkflowStep) {
        console.log("Workflow Event Received:", JSON.stringify(event));
        const { evidenceId, fileContext } = event.payload;

        // Step 1: Analyze Evidence with AI
        const aiResult = await step.do('analyze-evidence', async () => {
            if (!this.env.AI) {
                return {
                    summary: "AI processing unavailable.",
                    suggestedQsId: "safe.safeguarding",
                    suggestedCategoryId: "processes",
                    confidence: 0
                };
            }

            const systemPrompt = `
                You are an expert CQC compliance assistant. Analyze the provided context and extract key metadata.
                Taxonomy:
                - Categories: peoples_experience, staff_feedback, partner_feedback, observation, processes, outcomes
                - Key Questions (Examples): safe.safeguarding, effective.assessment, caring.kindness, responsive.person_centered, well_led.governance
                (Return valid IDs only. If unsure, use safe.safeguarding and processes)
             `;

            const userMessage = `
                Analyze this evidence file:
                Filename: ${fileContext?.filename || 'Unknown'}
                Type: ${fileContext?.mimeType || 'Unknown'}
                
                Please provide a summary and categorize it.
             `;

            // Call AI
            try {
                const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    response_format: {
                        type: "json_schema",
                        json_schema: {
                            type: "object",
                            properties: {
                                summary: { type: "string" },
                                suggestedQsId: { type: "string" },
                                suggestedCategoryId: { type: "string" },
                                confidence: { type: "number" }
                            },
                            required: ["summary", "suggestedQsId", "suggestedCategoryId", "confidence"]
                        }
                    }
                });

                let result = response;
                if (typeof response === 'string') {
                    try { result = JSON.parse(response); } catch { }
                }
                // @ts-ignore
                if (result.response) result = result.response;
                if (typeof result === 'string') {
                    result = JSON.parse(result);
                }

                return result;
            } catch (e) {
                console.error("AI Workflow Error", e);
                return {
                    summary: "AI analysis failed during workflow.",
                    suggestedQsId: "safe.safeguarding",
                    suggestedCategoryId: "processes",
                    confidence: 0
                };
            }
        });

        // Step 2: Update Database
        await step.do('update-database', async () => {
            const db = drizzle(this.env.DB, { schema });

            console.log(`AI Analysis for ${evidenceId}:`, aiResult);

            // Attempt to use AI suggestions if they seem valid (simple regex or list check could go here)
            // For now, allow overwrite. If FK fails, workflow will fail and retry (maybe bad if permanent).
            // Safe fallback:
            const safeQsId = aiResult.suggestedQsId.includes('.') ? aiResult.suggestedQsId : 'safe.safeguarding';
            // Categories in seed: processes, outcomes, observation, etc.
            const validCategories = ['peoples_experience', 'staff_feedback', 'partner_feedback', 'observation', 'processes', 'outcomes'];
            const safeCategoryId = validCategories.includes(aiResult.suggestedCategoryId) ? aiResult.suggestedCategoryId : 'processes';

            await db.update(schema.evidenceItems)
                .set({
                    status: 'draft',
                    qsId: safeQsId,
                    evidenceCategoryId: safeCategoryId,
                    summary: aiResult.summary,
                    aiConfidence: Math.round((aiResult.confidence || 0) * 100) // Store as integer percentage
                })
                .where(eq(schema.evidenceItems.id, evidenceId));
        });
    }
}
