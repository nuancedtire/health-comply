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
            const db = drizzle(this.env.DB, { schema });

            // 1. Fetch Context for AI (Local Controls & QS Taxonomy)
            // We need tenant/site context. But we only have evidenceId. 
            // We must fetch the evidence record FIRST to know which tenant/site we are in.
            const evidenceRecord = await db.query.evidenceItems.findFirst({
                where: eq(schema.evidenceItems.id, evidenceId)
            });

            if (!evidenceRecord) throw new Error(`Evidence ${evidenceId} not found`);

            // Fetch all Quality Statements (ID + Title)
            const allQs = await db.query.cqcQualityStatements.findMany({
                columns: { id: true, title: true }
            });

            // Fetch Local Controls for this site
            const siteControls = await db.query.localControls.findMany({
                where: (t, { and, eq }) => and(
                    eq(t.tenantId, evidenceRecord.tenantId),
                    eq(t.siteId, evidenceRecord.siteId),
                    eq(t.active, true)
                ),
                columns: { id: true, title: true, qsId: true }
            });

            const allCategories = await db.query.evidenceCategories.findMany();
            const categoriesList = allCategories.map(c => `- ${c.id}: ${c.title}`).join('\n');

            // Group controls by QS for better context mapping
            const controlsByQs = siteControls.reduce((acc, control) => {
                if (!acc[control.qsId]) acc[control.qsId] = [];
                acc[control.qsId].push(control);
                return acc;
            }, {} as Record<string, typeof siteControls>);

            // Build unified context grouping QS and their related controls
            // Filter out QS that have no controls to keep the prompt concise
            const qsAndControlsContext = allQs
                .filter(qs => controlsByQs[qs.id] && controlsByQs[qs.id].length > 0)
                .map(qs => {
                    const controls = controlsByQs[qs.id];
                    let text = `- QS [${qs.id}]: "${qs.title}"`;
                    text += `\n  Related Site Controls:\n` + controls.map(c => `    * "${c.title}" (ID: ${c.id})`).join('\n');
                    return text;
                }).join('\n');

            // 2. Fetch File Content & Convert to Markdown
            let fileContentMarkdown = "";
            let fileContextInfo = `Filename: ${fileContext?.filename || 'Unknown'}\nType: ${fileContext?.mimeType || 'Unknown'}`;

            try {
                if (evidenceRecord.r2Key && this.env.R2) {
                    const r2Object = await this.env.R2.get(evidenceRecord.r2Key);
                    if (r2Object) {
                        const mime = evidenceRecord.mimeType.toLowerCase();

                        // Strategy 1: Direct Text Read for text/*, json, etc.
                        if (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml')) {
                            fileContentMarkdown = await r2Object.text();
                            console.log(`Read ${fileContentMarkdown.length} chars directly from text file.`);
                        }
                        // Strategy 2: AI Conversion for PDFs and Images
                        else if (this.env.AI && typeof this.env.AI.toMarkdown === 'function') {
                            // Read as ArrayBuffer first to avoid R2 stream RPC issues
                            const buffer = await r2Object.arrayBuffer();
                            const blob = new Blob([buffer], { type: mime });

                            const conversion = await this.env.AI.toMarkdown([
                                {
                                    name: fileContext?.filename || 'evidence',
                                    blob: blob
                                }
                            ]);

                            console.log("Conversion Result:", JSON.stringify(conversion, null, 2));

                            // Handle response structure
                            // Cloudflare AI toMarkdown returns an array directly: [{ name, data, ... }]
                            let result: any = null;
                            if (Array.isArray(conversion)) {
                                result = conversion[0];
                            }

                            if (result && result.format === 'markdown') {
                                fileContentMarkdown = result.data;
                                console.log(`Converted ${evidenceRecord.r2Key} to ${result.tokens} tokens of markdown.`);
                            } else if (result?.error) {
                                console.warn("Markdown conversion error:", result.error);
                            } else {
                                console.warn("Markdown conversion returned unexpected format:", conversion);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching/converting file content:", e);
                // Continue without content
            }

            const systemPrompt = `
                You are an expert CQC compliance assistant for a healthcare provider.
                
                CONTEXT (Quality Statements & Their Active Site Controls):
                ${qsAndControlsContext}

                AVAILABLE EVIDENCE CATEGORIES:
                ${categoriesList}
                
                YOUR TASKS:
                1. ANALYZE CONTENT: Read the provided document content to understand its context and purpose.
                2. EXTRACT DATE: Look for a date representing when the activity occurred. Format: YYYY-MM-DD.
                3. MATCH QS & CONTROL:
                   - Identify the most relevant Quality Statement (QS ID) this evidence supports.
                   - Check if it fits into any of the EXISTING SITE CONTROLS listed under that QS. If it does, provide the 'matchedControlId'.
                   - If it belongs to a QS but none of the specific controls under it match well, provide 'null' for 'matchedControlId' and suggest a clear 'suggestedControlName'.
                4. CATEGORIZE: Map to one of the AVAILABLE EVIDENCE CATEGORIES IDs.
             `;

            const userMessage = `
                Analyze this evidence file:
                ${fileContextInfo}

                DOCUMENT CONTENT (Markdown/Text):
                ---
                ${fileContentMarkdown ? fileContentMarkdown : "(No text content extracted)"}
                ---
                
                Return JSON: {
                    "summary": "string",
                    "evidenceDate": "YYYY-MM-DD",
                    "matchedControlId": "string | null", 
                    "suggestedControlName": "string", 
                    "suggestedQsId": "string",
                    "suggestedCategoryId": "string",
                    "confidence": number
                }
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
                                evidenceDate: { type: "string" }, // "YYYY-MM-DD"
                                matchedControlId: { type: ["string", "null"] },
                                suggestedControlName: { type: "string" },
                                suggestedQsId: { type: "string" },
                                suggestedCategoryId: { type: "string" },
                                confidence: { type: "number" }
                            },
                            required: ["summary", "suggestedQsId", "confidence"]
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

                console.log("AI Result:", JSON.stringify(result, null, 2));
                return { ...result, extractedText: fileContentMarkdown };
            } catch (e) {
                console.error("AI Workflow Error", e);
                return {
                    __failed: true,
                    error: String(e)
                } as any;
            }
        });

        // Step 2: Update Database
        await step.do('update-database', async () => {
            const db = drizzle(this.env.DB, { schema });

            // Re-fetch evidence to be safe (or pass from step 1? No, separate steps)
            const evidence = await db.query.evidenceItems.findFirst({
                where: eq(schema.evidenceItems.id, evidenceId)
            });
            if (!evidence) return; // Should not happen

            // Check for failure signal
            // @ts-ignore
            if (aiResult.__failed) {
                console.warn(`AI Analysis failed for ${evidenceId}. Marking as failed (soft-delete).`);
                // Soft-delete: set status to 'failed' instead of deleting
                // User can see failed items and manually classify or delete them
                await db.update(schema.evidenceItems)
                    .set({
                        status: 'failed',
                        classificationResult: {
                            type: 'error',
                            error: aiResult.error || 'AI analysis failed',
                            failedAt: new Date().toISOString(),
                        } as any,
                    })
                    .where(eq(schema.evidenceItems.id, evidenceId));
                return;
            }

            // Logic to finalize data
            const safeQsId = aiResult.suggestedQsId?.includes('.') ? aiResult.suggestedQsId : 'safe.safeguarding';
            const validCategories = ['peoples_experience', 'staff_feedback', 'observation', 'processes', 'outcomes'];
            const safeCategoryId = validCategories.includes(aiResult.suggestedCategoryId) ? aiResult.suggestedCategoryId : 'processes';

            // Parse Date
            let evidenceDate = aiResult.evidenceDate ? new Date(aiResult.evidenceDate) : new Date();
            if (isNaN(evidenceDate.getTime())) evidenceDate = new Date();

            // Calculate Confidence
            const confidence = Math.round((aiResult.confidence || 0) * 100);
            
            // Determine Classification Type
            let type: 'match' | 'suggestion' | 'irrelevant' = 'irrelevant';
            if (confidence >= 80) type = 'match';
            else if (confidence >= 40) type = 'suggestion';

            // Resolve Control IDs
            let matchedControlId = aiResult.matchedControlId;
            if (matchedControlId === 'null' || matchedControlId === 'undefined') matchedControlId = undefined;
            
            // If we have a match but confidence is low, downgrade to suggestion
            if (matchedControlId && type === 'irrelevant') type = 'suggestion'; 
            
            // If no match found but we have a suggestion name, ensure type is suggestion (or irrelevant if very low)
            if (!matchedControlId && type === 'match') type = 'suggestion';

            // Construct Classification Result
            const classificationResult = {
                type,
                confidence,
                matchedControlId: matchedControlId,
                matchedControlTitle: matchedControlId ? (await db.query.localControls.findFirst({
                    where: eq(schema.localControls.id, matchedControlId),
                    columns: { title: true }
                }))?.title : undefined,
                suggestedControlTitle: aiResult.suggestedControlName,
                suggestedQsId: aiResult.suggestedQsId,
                reasoning: aiResult.summary || "AI Analysis completed.",
                analyzedAt: new Date().toISOString()
            };

            await db.update(schema.evidenceItems)
                .set({
                    status: 'draft',
                    qsId: safeQsId,
                    evidenceCategoryId: safeCategoryId,
                    // We DO NOT set localControlId here. We let the user confirm the match in Drafts.
                    // localControlId: null, 
                    classificationResult: classificationResult,
                    suggestedControlId: matchedControlId || null, // Use this column for the "suggested" FK reference
                    summary: aiResult.summary,
                    textContent: aiResult.extractedText, // Save the extracted markdown/text
                    evidenceDate: evidenceDate,
                    aiConfidence: confidence
                })
                .where(eq(schema.evidenceItems.id, evidenceId));

            console.log(`Updated evidence ${evidenceId} with classification ${type} (${confidence}%)`);
        });
    }
}