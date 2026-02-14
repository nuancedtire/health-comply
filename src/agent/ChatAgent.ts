import { DurableObject } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { eq, and, count, gte, lte, inArray } from "drizzle-orm";

interface Env {
    AI: any;
    DB: D1Database;
    EXA_API_KEY?: string;
    AI_SEARCH_INDEX?: string;
}

// Context sent from the frontend on initialization
export interface AgentContext {
    userId: string;
    userName: string;
    role: string;
    tenantId: string;
    tenantName: string;
    siteId: string;
    siteName: string;
    pageContext: {
        url: string;
        title: string;
        qsId?: string;
    };
}

// Rate limiting configuration
const RATE_LIMIT = {
    requestsPerMinute: 30,
    windowMs: 60 * 1000, // 1 minute
};

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export class ChatAgent extends DurableObject<Env> {
    state: DurableObjectState;
    context: AgentContext | null = null;
    history: {
        role: string;
        content: string;
        tool_calls?: any[];
        tool_call_id?: string;
        name?: string;
    }[] = [];
    rateLimits: Map<string, RateLimitEntry> = new Map();

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;
        // Restore history and rate limits
        this.state.blockConcurrencyWhile(async () => {
            this.history = (await this.state.storage.get("history")) || [];
            this.context = (await this.state.storage.get("context")) || null;
            const storedRateLimits = await this.state.storage.get<Map<string, RateLimitEntry>>("rateLimits");
            if (storedRateLimits) {
                this.rateLimits = storedRateLimits;
            }
        });
    }

    async fetch(request: Request) {
        const url = new URL(request.url);

        // 1. INITIALIZE CONTEXT
        if (url.pathname === "/init") {
            const newContext = await request.json<AgentContext>();

            // If site changed, reset conversation for security/privacy
            if (this.context && this.context.siteId !== newContext.siteId) {
                console.log(`Site changed from ${this.context.siteId} to ${newContext.siteId}. Resetting chat history.`);
                this.history = [];
                await this.state.storage.delete("history");
            }

            this.context = newContext;
            await this.state.storage.put("context", this.context);
            return new Response("OK");
        }

        // 2. CHAT LOOP
        if (url.pathname === "/chat") {
            if (!this.context) return new Response("Context missing", { status: 400 });

            const { message } = await request.json<{ message: string }>();

            // Check rate limiting
            const rateLimitResult = this.checkRateLimit(this.context.userId);
            if (!rateLimitResult.allowed) {
                return new Response(JSON.stringify({
                    content: `Rate limit exceeded. Please try again in ${Math.ceil(rateLimitResult.retryAfter! / 1000)} seconds.`,
                    steps: []
                }));
            }

            this.history.push({ role: "user", content: message });
            await this.saveHistory();

            const tools = this.getTools();
            const steps: any[] = [];

            // Run LLM with Workers AI
            let response: any;
            try {
                response = await this.runLLMWithWorkersAI([
                    { role: "system", content: this.getSystemPrompt() },
                    ...this.history
                ], tools.map(t => t.definition));
            } catch (err: any) {
                console.error("LLM Error:", err);
                return new Response(JSON.stringify({
                    content: `AI Error: ${err.message}`,
                    steps
                }));
            }

            // Standardize response format handling
            const responseMessage = response;
            const content = responseMessage.content || "";
            const toolCalls = responseMessage.tool_calls;

            // Save the tool call request to history
            if (toolCalls && toolCalls.length > 0) {
                this.history.push({
                    role: "assistant",
                    content: content,
                    tool_calls: toolCalls
                });
                await this.saveHistory();
            }

            // Handle Tool Calls
            let finalContent = content;

            if (toolCalls && toolCalls.length > 0) {
                const toolResults = [];
                for (const call of toolCalls) {
                    const tool = tools.find(t => t.definition.function.name === call.function.name);
                    if (tool) {
                        let args = {};
                        try {
                            args = JSON.parse(call.function.arguments);
                        } catch (e) {
                            console.error("Failed to parse tool arguments", e);
                        }

                        const stepInfo = {
                            tool: call.function.name,
                            input: args,
                            output: "",
                            sources: [] as any[]
                        };

                        try {
                            const result = await tool.handler(args);
                            const textContent = typeof result === 'string' ? result : result.text;
                            const sources = typeof result === 'object' ? result.sources : [];

                            stepInfo.output = textContent;
                            stepInfo.sources = sources;

                            const toolResultMsg = {
                                role: "tool",
                                tool_call_id: call.id,
                                content: JSON.stringify({
                                    text: textContent,
                                    sources: sources
                                })
                            };

                            toolResults.push(toolResultMsg);
                            this.history.push(toolResultMsg);

                        } catch (err: any) {
                            stepInfo.output = `Error: ${err.message}`;
                            const errorMsg = {
                                role: "tool",
                                tool_call_id: call.id,
                                content: `Error: ${err.message}`
                            };
                            toolResults.push(errorMsg);
                            this.history.push(errorMsg);
                        }
                        steps.push(stepInfo);
                    }
                }

                await this.saveHistory();

                try {
                    // Feed back to LLM
                    response = await this.runLLMWithWorkersAI([
                        { role: "system", content: this.getSystemPrompt() },
                        ...this.history
                    ]);

                    finalContent = response.content || "";

                } catch (err: any) {
                    console.error("Error in AI tool loop:", err);
                    return new Response(JSON.stringify({
                        content: `AI Error during processing: ${err.message}`,
                        steps
                    }));
                }
            }

            this.history.push({ role: "assistant", content: finalContent });
            await this.saveHistory();

            return new Response(JSON.stringify({
                content: finalContent,
                steps: steps
            }), { headers: { "Content-Type": "application/json" } });
        }

        // History Endpoint
        if (url.pathname === "/history") {
            return new Response(JSON.stringify(this.history || []), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Clear History Endpoint
        if (url.pathname === "/clear") {
            this.history = [];
            await this.state.storage.delete("history");
            return new Response("History cleared");
        }

        return new Response("Not found", { status: 404 });
    }

    async saveHistory() {
        if (this.history.length > 50) {
            this.history = this.history.slice(-50);
        }
        await this.state.storage.put("history", this.history);
        await this.state.storage.put("rateLimits", this.rateLimits);
    }

    // Rate limiting check
    checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
        const now = Date.now();
        const entry = this.rateLimits.get(userId);

        if (!entry || now > entry.resetAt) {
            // New window
            this.rateLimits.set(userId, {
                count: 1,
                resetAt: now + RATE_LIMIT.windowMs
            });
            return { allowed: true };
        }

        if (entry.count >= RATE_LIMIT.requestsPerMinute) {
            return { allowed: false, retryAfter: entry.resetAt - now };
        }

        entry.count++;
        return { allowed: true };
    }

    // --- TOOLS ---
    getTools() {
        const tools: any[] = [
            // Tool 1: Search Evidence (AI Search with DB fallback)
            {
                definition: {
                    type: "function",
                    function: {
                        name: "search_evidence",
                        description: "Search uploaded compliance evidence files in the specific site context. Use this when the user asks about documents, files, or evidence.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "The search query to find relevant evidence" },
                                qsId: { type: "string", description: "Optional: Filter by specific Quality Statement ID (e.g., 'safe.safeguarding')" }
                            },
                            required: ["query"]
                        }
                    }
                },
                handler: async (args: any) => {
                    return await this.searchEvidence(args.query, args.qsId);
                }
            },
            // Tool 2: Query Compliance Status
            {
                definition: {
                    type: "function",
                    function: {
                        name: "query_compliance_status",
                        description: "Query the compliance status of Quality Statements and controls. Use this when the user asks about compliance achieved, gaps, coverage, or status.",
                        parameters: {
                            type: "object",
                            properties: {
                                qsId: { type: "string", description: "Optional: Specific Quality Statement ID to check (e.g., 'safe.safeguarding')" },
                                keyQuestion: { type: "string", description: "Optional: Filter by key question (safe, effective, caring, responsive, well_led)" }
                            },
                            required: []
                        }
                    }
                },
                handler: async (args: any) => {
                    return await this.queryComplianceStatus(args.qsId, args.keyQuestion);
                }
            },
            // Tool 3: Query Evidence Metadata
            {
                definition: {
                    type: "function",
                    function: {
                        name: "query_evidence_metadata",
                        description: "Query metadata about evidence items (counts, status, dates, reviews). Use this for questions about evidence statistics or workflow status.",
                        parameters: {
                            type: "object",
                            properties: {
                                status: { type: "string", description: "Optional: Filter by status (draft, pending_review, approved, rejected, archived)" },
                                days: { type: "number", description: "Optional: Filter by evidence uploaded in the last N days" }
                            },
                            required: []
                        }
                    }
                },
                handler: async (args: any) => {
                    return await this.queryEvidenceMetadata(args.status, args.days);
                }
            }
        ];

        // Web search tool (only if EXA_API_KEY is configured)
        if (this.env.EXA_API_KEY) {
            tools.push({
                definition: {
                    type: "function",
                    function: {
                        name: "web_search",
                        description: "Search the public internet for CQC regulations, news, or clinical guidelines.",
                        parameters: {
                            type: "object",
                            properties: { query: { type: "string" } },
                            required: ["query"]
                        }
                    }
                },
                handler: async (args: any) => {
                    return await this.webSearch(args.query);
                }
            });
        }

        return tools;
    }

    // Search evidence using AI Search with DB fallback
    async searchEvidence(query: string, qsId?: string): Promise<{ text: string; sources: any[] }> {
        const tenantId = this.context!.tenantId;
        const siteId = this.context!.siteId;

        // Build search prefix: t/{tenantId}/s/{siteId}/
        const searchPrefix = `t/${tenantId}/s/${siteId}/`;
        const indexName = this.env.AI_SEARCH_INDEX || "health-comply";

        // Try AI Search first
        try {
            const searchRes = await this.env.AI.autorag(indexName).search({
                query: query,
                topK: 4,
                filters: {
                    type: "gte",
                    key: "id",
                    value: searchPrefix
                }
            });

            if (searchRes?.data && searchRes.data.length > 0) {
                const relevantMatches = searchRes.data;

                const sources = relevantMatches.map((m: any) => ({
                    title: m.metadata?.filename?.split('/').pop() || 'Unknown File',
                    href: '#',
                    type: 'file'
                }));

                const text = relevantMatches.map((m: any) => `[File: ${m.metadata?.filename}]
${m.text}`).join("\n---\n");

                return { text, sources };
            }
        } catch (e: any) {
            console.warn("AI Search failed, falling back to database:", e.message);
        }

        // Fallback: Database search on textContent
        try {
            const db = drizzle(this.env.DB, { schema });

            let conditions = [
                eq(schema.evidenceItems.tenantId, tenantId),
                eq(schema.evidenceItems.siteId, siteId)
            ];

            if (qsId) {
                conditions.push(eq(schema.evidenceItems.qsId, qsId));
            }

            const evidenceItems = await db.query.evidenceItems.findMany({
                where: (_table, { and }) => and(...conditions),
                columns: {
                    id: true,
                    title: true,
                    summary: true,
                    textContent: true,
                    r2Key: true,
                    status: true
                }
            });

            // Simple keyword matching on textContent and summary
            const keywords = query.toLowerCase().split(' ').filter(k => k.length > 3);
            const relevantItems = evidenceItems.filter(item => {
                const text = `${item.summary || ''} ${item.textContent || ''} ${item.title}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            }).slice(0, 4);

            if (relevantItems.length > 0) {
                const sources = relevantItems.map(item => ({
                    title: item.title,
                    href: '#',
                    type: 'file'
                }));

                const text = relevantItems.map(item => `[File: ${item.title}]
Status: ${item.status}
${item.summary || item.textContent || '(No text content)'}`).join("\n---\n");

                return { text, sources };
            }

            return { text: "No matching evidence found in your site context.", sources: [] };
        } catch (e: any) {
            console.error("Database search fallback failed:", e);
            return { text: `Error searching evidence: ${e.message}`, sources: [] };
        }
    }

    // Query compliance status for Quality Statements and controls
    async queryComplianceStatus(qsId?: string, keyQuestion?: string): Promise<{ text: string; sources: any[] }> {
        const tenantId = this.context!.tenantId;
        const siteId = this.context!.siteId;
        const db = drizzle(this.env.DB, { schema });

        try {
            // Build conditions
            let qsConditions = [eq(schema.cqcQualityStatements.active, 1)];

            if (qsId) {
                qsConditions.push(eq(schema.cqcQualityStatements.id, qsId));
            }

            if (keyQuestion) {
                qsConditions.push(eq(schema.cqcQualityStatements.keyQuestionId, keyQuestion));
            }

            // Get Quality Statements with their controls
            const qualityStatements = await db.select({
                qsId: schema.cqcQualityStatements.id,
                qsTitle: schema.cqcQualityStatements.title,
                keyQuestionId: schema.cqcQualityStatements.keyQuestionId
            })
            .from(schema.cqcQualityStatements)
            .where(and(...qsConditions));

            if (qualityStatements.length === 0) {
                return { text: "No Quality Statements found matching your criteria.", sources: [] };
            }

            const qsIds = qualityStatements.map(qs => qs.qsId);

            // Get local controls for these QS in this site
            const controls = await db.query.localControls.findMany({
                where: (table, { and, eq, inArray }) => and(
                    eq(table.tenantId, tenantId),
                    eq(table.siteId, siteId),
                    inArray(table.qsId, qsIds),
                    eq(table.active, true)
                ),
                columns: {
                    id: true,
                    title: true,
                    qsId: true
                }
            });

            // Get evidence counts per control
            const controlIds = controls.map(c => c.id);

            let evidenceCounts: { localControlId: string | null; count: number }[] = [];

            if (controlIds.length > 0) {
                const evidenceAgg = await db.select({
                    localControlId: schema.evidenceItems.localControlId,
                    count: count(schema.evidenceItems.id)
                })
                .from(schema.evidenceItems)
                .where(and(
                    eq(schema.evidenceItems.tenantId, tenantId),
                    eq(schema.evidenceItems.siteId, siteId),
                    inArray(schema.evidenceItems.localControlId, controlIds.filter(Boolean) as string[]),
                    eq(schema.evidenceItems.status, 'approved')
                ))
                .groupBy(schema.evidenceItems.localControlId);

                evidenceCounts = evidenceAgg;
            }

            // Build compliance report
            const report: string[] = [];

            for (const qs of qualityStatements) {
                const qsControls = controls.filter(c => c.qsId === qs.qsId);
                const totalControls = qsControls.length;
                const controlsWithEvidence = qsControls.filter(c =>
                    evidenceCounts.some(ec => ec.localControlId === c.id && ec.count > 0)
                ).length;

                const percentage = totalControls > 0 ? Math.round((controlsWithEvidence / totalControls) * 100) : 0;

                report.push(`\n**${qs.qsTitle}** (${qs.qsId})`);
                report.push(`- Total Controls: ${totalControls}`);
                report.push(`- Controls with Evidence: ${controlsWithEvidence}`);
                report.push(`- Coverage: ${percentage}%`);

                if (totalControls > 0 && controlsWithEvidence < totalControls) {
                    const gaps = qsControls
                        .filter(c => !evidenceCounts.some(ec => ec.localControlId === c.id && ec.count > 0))
                        .map(c => c.title);

                    if (gaps.length > 0) {
                        report.push(`- Gaps: ${gaps.slice(0, 3).join(', ')}${gaps.length > 3 ? ` and ${gaps.length - 3} more` : ''}`);
                    }
                }
            }

            const overallTotal = controls.length;
            const overallWithEvidence = evidenceCounts.filter(ec => ec.count > 0).length;
            const overallPercentage = overallTotal > 0 ? Math.round((overallWithEvidence / overallTotal) * 100) : 0;

            report.push(`\n**Overall Compliance Summary:**`);
            report.push(`- Total Active Controls: ${overallTotal}`);
            report.push(`- Controls with Approved Evidence: ${overallWithEvidence}`);
            report.push(`- Overall Coverage: ${overallPercentage}%`);

            return {
                text: report.join('\n'),
                sources: []
            };

        } catch (e: any) {
            console.error("Compliance query error:", e);
            return { text: `Error querying compliance status: ${e.message}`, sources: [] };
        }
    }

    // Query evidence metadata for statistics
    async queryEvidenceMetadata(status?: string, days?: number): Promise<{ text: string; sources: any[] }> {
        const tenantId = this.context!.tenantId;
        const siteId = this.context!.siteId;
        const db = drizzle(this.env.DB, { schema });

        try {
            let conditions = [
                eq(schema.evidenceItems.tenantId, tenantId),
                eq(schema.evidenceItems.siteId, siteId)
            ];

            if (status) {
                conditions.push(eq(schema.evidenceItems.status, status));
            }

            if (days) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                conditions.push(gte(schema.evidenceItems.uploadedAt, cutoffDate));
            }

            // Get counts by status
            const statusCounts = await db.select({
                status: schema.evidenceItems.status,
                count: count(schema.evidenceItems.id)
            })
            .from(schema.evidenceItems)
            .where(and(...conditions.filter(c => !('operator' in c && c.constructor.name === 'Sql'))))
            .groupBy(schema.evidenceItems.status);

            // Get total count
            const totalResult = await db.select({
                count: count(schema.evidenceItems.id)
            })
            .from(schema.evidenceItems)
            .where(and(
                eq(schema.evidenceItems.tenantId, tenantId),
                eq(schema.evidenceItems.siteId, siteId)
            ));

            const total = totalResult[0]?.count || 0;

            // Get recent evidence (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentCount = await db.select({
                count: count(schema.evidenceItems.id)
            })
            .from(schema.evidenceItems)
            .where(and(
                eq(schema.evidenceItems.tenantId, tenantId),
                eq(schema.evidenceItems.siteId, siteId),
                gte(schema.evidenceItems.uploadedAt, thirtyDaysAgo)
            ));

            // Get expiring evidence (validUntil in next 30 days)
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            const expiringCount = await db.select({
                count: count(schema.evidenceItems.id)
            })
            .from(schema.evidenceItems)
            .where(and(
                eq(schema.evidenceItems.tenantId, tenantId),
                eq(schema.evidenceItems.siteId, siteId),
                lte(schema.evidenceItems.validUntil, thirtyDaysFromNow),
                gte(schema.evidenceItems.validUntil, new Date())
            ));

            const report: string[] = [];
            report.push(`**Evidence Statistics for ${this.context?.siteName}**\n`);
            report.push(`Total Evidence Items: ${total}`);

            if (statusCounts.length > 0) {
                report.push(`\nBy Status:`);
                statusCounts.forEach(sc => {
                    report.push(`- ${sc.status}: ${sc.count}`);
                });
            }

            report.push(`\nRecent Activity:`);
            report.push(`- Uploaded in last 30 days: ${recentCount[0]?.count || 0}`);
            report.push(`- Expiring in next 30 days: ${expiringCount[0]?.count || 0}`);

            return { text: report.join('\n'), sources: [] };

        } catch (e: any) {
            console.error("Evidence metadata query error:", e);
            return { text: `Error querying evidence metadata: ${e.message}`, sources: [] };
        }
    }

    // Web search using Exa.ai
    async webSearch(query: string): Promise<{ text: string; sources: any[] }> {
        if (!this.env.EXA_API_KEY) {
            return { text: "Web search disabled (No API Key).", sources: [] };
        }

        try {
            const res = await fetch("https://api.exa.ai/search", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.env.EXA_API_KEY
                },
                body: JSON.stringify({
                    query: query,
                    numResults: 3,
                    useAutoprompt: true,
                    contents: { text: true }
                })
            });
            const data = await res.json<any>();

            if (data.results) {
                const text = data.results.map((r: any) =>
                    `[Title: ${r.title}]
[URL: ${r.url}]
${r.text.slice(0, 10000)}...`
                ).join("\n\n");

                const sources = data.results.map((r: any) => ({
                    title: r.title,
                    href: r.url,
                    type: 'web'
                }));

                return { text, sources };
            }

            return { text: "No web results found.", sources: [] };
        } catch (e: any) {
            console.error("Exa search error:", e);
            return { text: "Web search failed.", sources: [] };
        }
    }

    // --- PROMPT ---
    getSystemPrompt() {
        const c = this.context!;
        if (!c) return "You are a helpful assistant.";

        return `You are Compass, the CQC compliance assistant for ${c.tenantName} (${c.siteName}).
User: ${c.userName} (${c.role}).
Current Page: ${c.pageContext.title}
${c.pageContext.qsId ? `Focus: Quality Statement ${c.pageContext.qsId}` : ""}

AVAILABLE TOOLS:
1. search_evidence - Search uploaded documents and evidence files
2. query_compliance_status - Check compliance coverage for Quality Statements and controls
3. query_evidence_metadata - Get statistics about evidence items (counts, status, expiring)
${this.env.EXA_API_KEY ? "4. web_search - Search external CQC regulations and guidelines" : ""}

RULES:
1. If user asks about "our evidence", "my files", or specific documents, use 'search_evidence'.
2. If user asks about "compliance achieved", "gaps", "what QS are covered", use 'query_compliance_status'.
3. If user asks about "how many evidence items", "what's pending review", "what's expiring", use 'query_evidence_metadata'.
4. If user asks about external regulations or CQC guidance${this.env.EXA_API_KEY ? ", use 'web_search'" : ", explain that web search is not configured"}.
5. Be friendly, helpful, professional, and concise.
6. You do not always need to use a tool if you can answer directly.
7. Use tools only when necessary to provide accurate information.
8. Always consider the current site context (${c.siteName}) when answering.`;
    }

    // Run LLM with Workers AI
    async runLLMWithWorkersAI(messages: any[], tools: any[] | null = null): Promise<any> {
        const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

        const body: any = {
            messages: messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        };

        if (tools && tools.length > 0) {
            body.tools = tools;
        }

        try {
            const response = await this.env.AI.run(model, body);
            return response;
        } catch (e: any) {
            console.error("Workers AI Error:", e);
            throw new Error(`AI processing failed: ${e.message}`);
        }
    }
}
