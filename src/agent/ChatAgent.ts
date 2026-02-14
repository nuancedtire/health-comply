import { DurableObject } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { eq, and, count, gte, lte, inArray } from "drizzle-orm";

interface Env {
  AI: any;
  DB: D1Database;
  CEREBRAS_API_KEY?: string;
  EXA_API_KEY?: string;
  AI_SEARCH_INDEX?: string;
  [key: string]: any;
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

// P2: Query Classification type (Anthropic Pattern: Routing)
interface QueryClassification {
  primaryIntent: string;
  suggestedTools: string[];
  rewrittenQuery: string;
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

  // P2: CACHE CONFIGURATION
  private readonly CACHE_TTL = {
    search: 5 * 60 * 1000, // 5 minutes
    compliance: 60 * 60 * 1000, // 1 hour
    metadata: 15 * 60 * 1000, // 15 minutes
  };

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    // Restore history and rate limits
    this.state.blockConcurrencyWhile(async () => {
      this.history = (await this.state.storage.get("history")) || [];
      this.context = (await this.state.storage.get("context")) || null;
      const storedRateLimits =
        await this.state.storage.get<Map<string, RateLimitEntry>>("rateLimits");
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
        console.log(
          `Site changed from ${this.context.siteId} to ${newContext.siteId}. Resetting chat history.`,
        );
        this.history = [];
        await this.state.storage.delete("history");
      }

      this.context = newContext;
      await this.state.storage.put("context", this.context);
      return new Response("OK");
    }

    // 2. CHAT LOOP
    if (url.pathname === "/chat") {
      if (!this.context)
        return new Response("Context missing", { status: 400 });

      const { message } = await request.json<{ message: string }>();

      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(this.context.userId);
      if (!rateLimitResult.allowed) {
        return new Response(
          JSON.stringify({
            content: `Rate limit exceeded. Please try again in ${Math.ceil(rateLimitResult.retryAfter! / 1000)} seconds.`,
            steps: [],
          }),
        );
      }

      this.history.push({ role: "user", content: message });
      await this.saveHistory();

      const tools = this.getTools();
      const steps: any[] = [];

      // P2: CLASSIFICATION STEP (Anthropic Pattern: Routing)
      // Classify query to determine tool categories and improved query - always pass to LLM
      const classification = await this.classifyQuery(message);

      // Log classification results
      console.log(
        `[ChatAgent] Router suggested tools:`,
        classification.suggestedTools,
      );

      // Update the message with rewritten query if provided
      const processedMessage = classification.rewrittenQuery || message;
      const messageHistory = this.history.map((msg) => {
        if (msg.role === "user" && msg.content === message) {
          return { ...msg, content: processedMessage };
        }
        return msg;
      });

      // Always run LLM - classification only provides context, doesn't bypass
      // Run LLM via Cerebras (OpenAI-compatible)
      let response: any;
      try {
        response = await this.runLLM(
          [
            {
              role: "system",
              content:
                this.getSystemPrompt() +
                `\n\nThe user is asking about: ${classification.primaryIntent}. ` +
                (classification.suggestedTools.length > 0
                  ? `Use the following tool(s) to answer: ${classification.suggestedTools.join(", ")}. Call all relevant tools before providing your response.`
                  : `Answer directly without using tools.`),
            },
            ...messageHistory,
          ],
          tools.map((t) => t.definition),
        );
      } catch (err: any) {
        console.error("LLM Error:", err);
        return new Response(
          JSON.stringify({
            content: `AI Error: ${err.message}`,
            steps,
          }),
        );
      }

      // Parse OpenAI-compatible response from Cerebras
      const choice = response.choices?.[0];
      const responseMessage = choice?.message;
      const content = responseMessage?.content || "";
      const toolCalls = responseMessage?.tool_calls;

      // Debug logging
      console.log(`[ChatAgent] LLM response:`, {
        content: content?.substring(0, 200),
        hasToolCalls: !!toolCalls,
        toolCount: toolCalls?.length || 0,
        toolNames:
          toolCalls?.map((tc: any) => tc.function?.name || tc.name) || [],
      });

      // If there are tool calls, ignore any content from this response (it's likely malformed)
      // and wait for the synthesis step to generate proper content
      let finalContent = toolCalls && toolCalls.length > 0 ? "" : content;

      // Save the tool call request to history
      if (toolCalls && toolCalls.length > 0) {
        this.history.push({
          role: "assistant",
          content: "", // Don't save malformed content
          // @ts-ignore
          tool_calls: toolCalls,
        });
        await this.saveHistory();
      }

      // Handle Tool Calls - PARALLEL EXECUTION (Anthropic Pattern: Parallelization)
      // Note: finalContent already declared above after classification
      if (toolCalls && toolCalls.length > 0) {
        // Execute all independent tools in parallel for 2-3x speedup
        // Anthropic Pattern: Parallelization - enable simultaneous task processing
        const toolPromises = toolCalls.map(async (call: any) => {
          const tool = tools.find(
            (t) => t.definition.function.name === call.function.name,
          );
          if (!tool) {
            return {
              call,
              success: false,
              error: `Tool not found: ${call.function.name}`,
            };
          }

          // Parse arguments: they come as a JSON string from Cerebras
          let args = {};
          try {
            args = JSON.parse(call.function.arguments);
          } catch (e) {
            console.error("Failed to parse tool arguments", e);
            return {
              call,
              success: false,
              error: `Failed to parse arguments: ${e}`,
            };
          }

          // Record step start
          const stepInfo = {
            tool: call.function.name,
            input: args,
            output: "",
            sources: [] as any[],
          };

          try {
            // Execute tool - returns { text, sources }
            const result = await tool.handler(args);

            const textContent =
              typeof result === "string" ? result : result.text;
            const sources = typeof result === "object" ? result.sources : [];

            stepInfo.output = textContent;
            stepInfo.sources = sources;

            // Tool result content for LLM - plain text with sources appended
            const toolResultContent =
              sources && sources.length > 0
                ? `${textContent}\n\nSources:\n${sources.map((s: any) => `- ${s.title}: ${s.href}`).join("\n")}`
                : textContent;

            const toolResultMsg = {
              role: "tool" as const,
              tool_call_id: call.id,
              content: toolResultContent,
            };

            return {
              call,
              success: true,
              toolResultMsg,
              stepInfo,
            };
          } catch (err: any) {
            stepInfo.output = `Error: ${err.message}`;
            return {
              call,
              success: false,
              error: err.message,
              stepInfo,
            };
          }
        });

        // Execute all tools in parallel
        const results = await Promise.all(toolPromises);
        console.log(
          `[ChatAgent] Tool execution results:`,
          results.map((r: any) => ({
            tool: r.call?.function?.name,
            success: r.success,
            hasStepInfo: !!r.stepInfo,
            outputPreview: r.stepInfo?.output?.substring(0, 100),
          })),
        );

        // Process results in order to maintain conversation flow
        const toolResults = [];
        for (const result of results) {
          if (result.success && result.toolResultMsg && result.stepInfo) {
            toolResults.push(result.toolResultMsg);
            this.history.push(result.toolResultMsg);
            steps.push(result.stepInfo);
          } else if (!result.success && result.stepInfo) {
            const errorMsg = {
              role: "tool" as const,
              tool_call_id: result.call.id,
              content: `Error: ${result.error}`,
            };
            toolResults.push(errorMsg);
            this.history.push(errorMsg);
            steps.push(result.stepInfo);
          }
        }

        // Save history after all tools run
        await this.saveHistory();

        try {
          // Feed back to LLM for final response
          const synthesisPrompt = `You are Compass, a CQC compliance assistant. Based on the tool results in the conversation history above, provide a helpful summary for the user.

Rules:
- Write in natural, conversational English
- Do not include JSON, code blocks, or raw tool output
- Summarize the key findings and provide actionable recommendations`;

          response = await this.runLLM([
            { role: "system", content: synthesisPrompt },
            ...this.history,
          ]);

          finalContent = response.choices?.[0]?.message?.content || "";
        } catch (err: any) {
          console.error("Error in AI tool loop:", err);
          return new Response(
            JSON.stringify({
              content: `AI Error during processing: ${err.message}`,
              steps,
            }),
          );
        }
      }

      this.history.push({ role: "assistant", content: finalContent });
      await this.saveHistory();

      // Debug logging
      console.log(
        `[ChatAgent] Returning response with ${steps.length} tool step(s)`,
      );

      // Return Structured Response
      return new Response(
        JSON.stringify({
          content: finalContent,
          steps: steps,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // History Endpoint
    if (url.pathname === "/history") {
      return new Response(JSON.stringify(this.history || []), {
        headers: { "Content-Type": "application/json" },
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

  // P2: CACHING LAYER - Cache expensive operations in DO storage
  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.state.storage.get<{
        data: T;
        timestamp: number;
      }>(key);
      if (cached) {
        return cached.data;
      }
    } catch (e) {
      console.warn("Cache get error:", e);
    }
    return null;
  }

  private async setCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await this.state.storage.put(key, {
        data,
        timestamp: Date.now(),
      });
      // Set expiration (Durable Objects don't auto-expire, but we check on read)
      setTimeout(() => {
        this.state.storage.delete(key).catch(() => {});
      }, ttl);
    } catch (e) {
      console.warn("Cache set error:", e);
    }
  }

  private getCacheKey(type: string, params: string): string {
    const tenantId = this.context?.tenantId || "unknown";
    const siteId = this.context?.siteId || "unknown";
    return `cache:${type}:${tenantId}:${siteId}:${params}`;
  }

  // Rate limiting check
  checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.rateLimits.get(userId);

    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(userId, {
        count: 1,
        resetAt: now + RATE_LIMIT.windowMs,
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
            description:
              "Search uploaded compliance evidence files in the specific site context. Use this when the user asks about documents, files, or evidence.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to find relevant evidence",
                },
                qsId: {
                  type: "string",
                  description:
                    "Optional: Filter by specific Quality Statement ID (e.g., 'safe.safeguarding')",
                },
              },
              required: ["query"],
            },
          },
        },
        handler: async (args: any) => {
          return await this.searchEvidence(args.query, args.qsId);
        },
      },
      // Tool 2: Query Compliance Status
      {
        definition: {
          type: "function",
          function: {
            name: "query_compliance_status",
            description:
              "Query the compliance status of Quality Statements and controls. Use this when the user asks about compliance achieved, gaps, coverage, or status.",
            parameters: {
              type: "object",
              properties: {
                qsId: {
                  type: "string",
                  description:
                    "Optional: Specific Quality Statement ID to check (e.g., 'safe.safeguarding')",
                },
                keyQuestion: {
                  type: "string",
                  description:
                    "Optional: Filter by key question (safe, effective, caring, responsive, well_led)",
                },
              },
              required: [],
            },
          },
        },
        handler: async (args: any) => {
          return await this.queryComplianceStatus(args.qsId, args.keyQuestion);
        },
      },
      // Tool 3: Query Evidence Metadata
      {
        definition: {
          type: "function",
          function: {
            name: "query_evidence_metadata",
            description:
              "Query metadata about evidence items (counts, status, dates, reviews). Use this for questions about evidence statistics or workflow status.",
            parameters: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  description:
                    "Optional: Filter by status (draft, pending_review, approved, rejected, archived)",
                },
                days: {
                  type: "number",
                  description:
                    "Optional: Filter by evidence uploaded in the last N days",
                },
              },
              required: [],
            },
          },
        },
        handler: async (args: any) => {
          return await this.queryEvidenceMetadata(args.status, args.days);
        },
      },
    ];

    // Web search tool (only if EXA_API_KEY is configured)
    if (this.env.EXA_API_KEY) {
      tools.push({
        definition: {
          type: "function",
          function: {
            name: "web_search",
            description:
              "Search the public internet for CQC regulations, news, or clinical guidelines.",
            parameters: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
          },
        },
        handler: async (args: any) => {
          return await this.webSearch(args.query);
        },
      });
    }

    return tools;
  }

  // Search evidence using AI Search with DB fallback
  async searchEvidence(
    query: string,
    qsId?: string,
  ): Promise<{ text: string; sources: any[] }> {
    const tenantId = this.context!.tenantId;
    const siteId = this.context!.siteId;

    // P2: Check cache first
    const cacheKey = this.getCacheKey("search", `${query}:${qsId || "all"}`);
    const cachedResult = await this.getCached<{ text: string; sources: any[] }>(
      cacheKey,
    );
    if (cachedResult) {
      return cachedResult;
    }

    // Build search prefix: t/{tenantId}/s/{siteId}/
    const searchPrefix = `t/${tenantId}/s/${siteId}/`;
    const indexName = this.env.AI_SEARCH_INDEX || "health-comply";

    // Try AI Search first
    try {
      const searchRes = await this.env.AI.autorag(indexName).search({
        query: query,
        max_num_results: 4,
        filters: {
          type: "eq",
          key: "folder",
          value: searchPrefix,
        },
      });

      if (searchRes?.data && searchRes.data.length > 0) {
        const relevantMatches = searchRes.data;

        const sources = relevantMatches.map((m: any) => ({
          title: m.metadata?.filename?.split("/").pop() || "Unknown File",
          href: "#",
          type: "file",
        }));

        const text = relevantMatches
          .map(
            (m: any) => `[File: ${m.metadata?.filename}]
${m.text}`,
          )
          .join("\n---\n");

        const result = { text, sources };
        // Cache the result
        await this.setCache(cacheKey, result, this.CACHE_TTL.search);
        return result;
      }
    } catch (e: any) {
      console.warn("AI Search failed, falling back to database:", e.message);
    }

    // Fallback: Database search on textContent
    try {
      const db = drizzle(this.env.DB, { schema });

      let conditions = [
        eq(schema.evidenceItems.tenantId, tenantId),
        eq(schema.evidenceItems.siteId, siteId),
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
          status: true,
        },
      });

      // Simple keyword matching on textContent and summary
      const keywords = query
        .toLowerCase()
        .split(" ")
        .filter((k) => k.length > 3);
      const relevantItems = evidenceItems
        .filter((item) => {
          const text =
            `${item.summary || ""} ${item.textContent || ""} ${item.title}`.toLowerCase();
          return keywords.some((kw) => text.includes(kw));
        })
        .slice(0, 4);

      if (relevantItems.length > 0) {
        const sources = relevantItems.map((item) => ({
          title: item.title,
          href: "#",
          type: "file",
        }));

        const text = relevantItems
          .map(
            (item) => `[File: ${item.title}]
Status: ${item.status}
${item.summary || item.textContent || "(No text content)"}`,
          )
          .join("\n---\n");

        const result = { text, sources };
        // Cache the result
        await this.setCache(cacheKey, result, this.CACHE_TTL.search);
        return result;
      }

      const emptyResult = {
        text: "No matching evidence found in your site context.",
        sources: [],
      };
      // Cache empty results too (for shorter time)
      await this.setCache(cacheKey, emptyResult, this.CACHE_TTL.search / 2);
      return emptyResult;
    } catch (e: any) {
      console.error("Database search fallback failed:", e);
      return { text: `Error searching evidence: ${e.message}`, sources: [] };
    }
  }

  // Query compliance status for Quality Statements and controls
  async queryComplianceStatus(
    qsId?: string,
    keyQuestion?: string,
  ): Promise<{ text: string; sources: any[] }> {
    const tenantId = this.context!.tenantId;
    const siteId = this.context!.siteId;

    // P2: Check cache first (compliance status changes infrequently)
    const cacheKey = this.getCacheKey(
      "compliance",
      `${qsId || "all"}:${keyQuestion || "all"}`,
    );
    const cachedResult = await this.getCached<{ text: string; sources: any[] }>(
      cacheKey,
    );
    if (cachedResult) {
      return cachedResult;
    }

    const db = drizzle(this.env.DB, { schema });

    try {
      // Build conditions
      let qsConditions = [eq(schema.cqcQualityStatements.active, 1)];

      if (qsId) {
        qsConditions.push(eq(schema.cqcQualityStatements.id, qsId));
      }

      if (keyQuestion) {
        qsConditions.push(
          eq(schema.cqcQualityStatements.keyQuestionId, keyQuestion),
        );
      }

      // Get Quality Statements with their controls
      const qualityStatements = await db
        .select({
          qsId: schema.cqcQualityStatements.id,
          qsTitle: schema.cqcQualityStatements.title,
          keyQuestionId: schema.cqcQualityStatements.keyQuestionId,
        })
        .from(schema.cqcQualityStatements)
        .where(and(...qsConditions));

      if (qualityStatements.length === 0) {
        return {
          text: "No Quality Statements found matching your criteria.",
          sources: [],
        };
      }

      const qsIds = qualityStatements.map((qs) => qs.qsId);

      // Get local controls for these QS in this site
      const controls = await db.query.localControls.findMany({
        where: (table, { and, eq, inArray }) =>
          and(
            eq(table.tenantId, tenantId),
            eq(table.siteId, siteId),
            inArray(table.qsId, qsIds),
            eq(table.active, true),
          ),
        columns: {
          id: true,
          title: true,
          qsId: true,
        },
      });

      // Get evidence counts per control
      const controlIds = controls.map((c) => c.id);

      let evidenceCounts: { localControlId: string | null; count: number }[] =
        [];

      if (controlIds.length > 0) {
        const evidenceAgg = await db
          .select({
            localControlId: schema.evidenceItems.localControlId,
            count: count(schema.evidenceItems.id),
          })
          .from(schema.evidenceItems)
          .where(
            and(
              eq(schema.evidenceItems.tenantId, tenantId),
              eq(schema.evidenceItems.siteId, siteId),
              inArray(
                schema.evidenceItems.localControlId,
                controlIds.filter(Boolean) as string[],
              ),
              eq(schema.evidenceItems.status, "approved"),
            ),
          )
          .groupBy(schema.evidenceItems.localControlId);

        evidenceCounts = evidenceAgg;
      }

      // Build compliance report
      const report: string[] = [];

      for (const qs of qualityStatements) {
        const qsControls = controls.filter((c) => c.qsId === qs.qsId);
        const totalControls = qsControls.length;
        const controlsWithEvidence = qsControls.filter((c) =>
          evidenceCounts.some(
            (ec) => ec.localControlId === c.id && ec.count > 0,
          ),
        ).length;

        const percentage =
          totalControls > 0
            ? Math.round((controlsWithEvidence / totalControls) * 100)
            : 0;

        report.push(`\n**${qs.qsTitle}** (${qs.qsId})`);
        report.push(`- Total Controls: ${totalControls}`);
        report.push(`- Controls with Evidence: ${controlsWithEvidence}`);
        report.push(`- Coverage: ${percentage}%`);

        if (totalControls > 0 && controlsWithEvidence < totalControls) {
          const gaps = qsControls
            .filter(
              (c) =>
                !evidenceCounts.some(
                  (ec) => ec.localControlId === c.id && ec.count > 0,
                ),
            )
            .map((c) => c.title);

          if (gaps.length > 0) {
            report.push(
              `- Gaps: ${gaps.slice(0, 3).join(", ")}${gaps.length > 3 ? ` and ${gaps.length - 3} more` : ""}`,
            );
          }
        }
      }

      const overallTotal = controls.length;
      const overallWithEvidence = evidenceCounts.filter(
        (ec) => ec.count > 0,
      ).length;
      const overallPercentage =
        overallTotal > 0
          ? Math.round((overallWithEvidence / overallTotal) * 100)
          : 0;

      report.push(`\n**Overall Compliance Summary:**`);
      report.push(`- Total Active Controls: ${overallTotal}`);
      report.push(`- Controls with Approved Evidence: ${overallWithEvidence}`);
      report.push(`- Overall Coverage: ${overallPercentage}%`);

      const result = {
        text: report.join("\n"),
        sources: [],
      };
      // Cache compliance results (they change infrequently)
      await this.setCache(cacheKey, result, this.CACHE_TTL.compliance);
      return result;
    } catch (e: any) {
      console.error("Compliance query error:", e);
      return {
        text: `Error querying compliance status: ${e.message}`,
        sources: [],
      };
    }
  }

  // Query evidence metadata for statistics
  async queryEvidenceMetadata(
    status?: string,
    days?: number,
  ): Promise<{ text: string; sources: any[] }> {
    const tenantId = this.context!.tenantId;
    const siteId = this.context!.siteId;

    // P2: Check cache first (metadata changes more frequently but still worth caching)
    const cacheKey = this.getCacheKey(
      "metadata",
      `${status || "all"}:${days || "30"}`,
    );
    const cachedResult = await this.getCached<{ text: string; sources: any[] }>(
      cacheKey,
    );
    if (cachedResult) {
      return cachedResult;
    }

    const db = drizzle(this.env.DB, { schema });

    try {
      // Build base conditions with tenant/site filter
      let baseConditions = [
        eq(schema.evidenceItems.tenantId, tenantId),
        eq(schema.evidenceItems.siteId, siteId),
      ];

      // Apply status filter if provided
      if (status) {
        baseConditions.push(eq(schema.evidenceItems.status, status));
      }

      // Apply days filter if provided (uploaded in last N days)
      if (days && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        baseConditions.push(gte(schema.evidenceItems.uploadedAt, cutoffDate));
      }

      // Get counts by status (respecting other filters but not status itself for the breakdown)
      let statusCountConditions = [
        eq(schema.evidenceItems.tenantId, tenantId),
        eq(schema.evidenceItems.siteId, siteId),
      ];
      if (days && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        statusCountConditions.push(
          gte(schema.evidenceItems.uploadedAt, cutoffDate),
        );
      }

      const statusCounts = await db
        .select({
          status: schema.evidenceItems.status,
          count: count(schema.evidenceItems.id),
        })
        .from(schema.evidenceItems)
        .where(and(...statusCountConditions))
        .groupBy(schema.evidenceItems.status);

      // Get total count (with all filters applied)
      const totalResult = await db
        .select({
          count: count(schema.evidenceItems.id),
        })
        .from(schema.evidenceItems)
        .where(and(...baseConditions));

      const total = totalResult[0]?.count || 0;

      // Get recent evidence (last 30 days, or custom days if provided)
      const recentDays = days || 30;
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - recentDays);

      let recentConditions = [
        eq(schema.evidenceItems.tenantId, tenantId),
        eq(schema.evidenceItems.siteId, siteId),
        gte(schema.evidenceItems.uploadedAt, recentCutoff),
      ];
      if (status) {
        recentConditions.push(eq(schema.evidenceItems.status, status));
      }

      const recentCount = await db
        .select({
          count: count(schema.evidenceItems.id),
        })
        .from(schema.evidenceItems)
        .where(and(...recentConditions));

      // Get expiring evidence (validUntil in next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      let expiringConditions = [
        eq(schema.evidenceItems.tenantId, tenantId),
        eq(schema.evidenceItems.siteId, siteId),
        lte(schema.evidenceItems.validUntil, thirtyDaysFromNow),
        gte(schema.evidenceItems.validUntil, new Date()),
      ];
      if (status) {
        expiringConditions.push(eq(schema.evidenceItems.status, status));
      }

      const expiringCount = await db
        .select({
          count: count(schema.evidenceItems.id),
        })
        .from(schema.evidenceItems)
        .where(and(...expiringConditions));

      // Build report
      const report: string[] = [];
      const filterDesc = [];
      if (status) filterDesc.push(`status: ${status}`);
      if (days) filterDesc.push(`last ${days} days`);

      report.push(
        `**Evidence Statistics for ${this.context?.siteName}${filterDesc.length > 0 ? ` (${filterDesc.join(", ")})` : ""}**\n`,
      );
      report.push(`Total Evidence Items: ${total}`);

      if (statusCounts.length > 0 && !status) {
        report.push(`\nBy Status:`);
        statusCounts.forEach((sc) => {
          report.push(`- ${sc.status}: ${sc.count}`);
        });
      }

      report.push(`\nRecent Activity:`);
      report.push(
        `- Uploaded in last ${recentDays} days: ${recentCount[0]?.count || 0}`,
      );
      report.push(
        `- Expiring in next 30 days: ${expiringCount[0]?.count || 0}`,
      );

      return { text: report.join("\n"), sources: [] };
    } catch (e: any) {
      console.error("Evidence metadata query error:", e);
      return {
        text: `Error querying evidence metadata: ${e.message}`,
        sources: [],
      };
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
          "x-api-key": this.env.EXA_API_KEY,
        },
        body: JSON.stringify({
          query: query,
          numResults: 5,
          useAutoprompt: true,
          contents: { text: true },
        }),
      });
      const data = await res.json<any>();

      if (data.results) {
        const text = data.results
          .map(
            (r: any) =>
              `[Title: ${r.title}]\n[URL: ${r.url}]\n${r.text.slice(0, 10000)}...`,
          )
          .join("\n\n");

        const sources = data.results.map((r: any) => ({
          title: r.title,
          href: r.url,
          type: "web",
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
1. search_evidence - Search uploaded compliance documents and evidence files
2. query_compliance_status - Check compliance coverage, gaps, and what's missing for Quality Statements
3. query_evidence_metadata - Get statistics about evidence (counts, pending reviews, expiring)
${this.env.EXA_API_KEY ? "4. web_search - Search external CQC regulations, guidelines, and best practices" : ""}

INSTRUCTIONS:
1. Use the available tools via function calls when needed to answer user questions
2. Call multiple tools in parallel if they provide complementary information
3. Synthesize tool results into natural, helpful responses - never echo raw JSON or tool arguments
4. Be friendly, professional, and concise`;
  }

  // LLM-based Router (Anthropic Pattern: Routing)
  // Uses LLM to intelligently route queries to appropriate tools
  async classifyQuery(message: string): Promise<QueryClassification> {
    // Quick check for simple greetings/thanks (no LLM call needed)
    const lowerMessage = message.toLowerCase().trim();
    if (["hi", "hello", "hey", "thanks", "thank you"].includes(lowerMessage)) {
      return {
        primaryIntent: lowerMessage.includes("thank")
          ? "acknowledgment"
          : "greeting",
        suggestedTools: [],
        rewrittenQuery: message,
      };
    }

    // Available tools for the LLM to choose from
    const availableTools = [
      {
        name: "search_evidence",
        description:
          "Search user's uploaded compliance evidence files and documents. Use for: finding files, checking what evidence exists, looking up documents, 'my files', 'our evidence'",
      },
      {
        name: "query_compliance_status",
        description:
          "Check compliance coverage, gaps, what's missing, which Quality Statements have evidence. Use for: 'missing evidence', 'what do I need', 'gaps', 'coverage', 'compliance achieved'",
      },
      {
        name: "query_evidence_metadata",
        description:
          "Get statistics about evidence: counts, pending reviews, expiring items, dates. Use for: 'how many', 'counts', 'statistics', 'status of evidence'",
      },
      {
        name: "web_search",
        description:
          "Search external CQC regulations, guidelines, best practices. Use for: external regulations, guidance, best practices, 'research online', 'what does CQC require'",
      },
    ].filter((t) => t.name !== "web_search" || this.env.EXA_API_KEY);

    const routerPrompt = `You are a query router for a CQC compliance assistant. Analyze the user query and decide which tools to use.

Available Tools:
${availableTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

User Query: "${message}"

Respond in JSON format:
{
  "primaryIntent": "brief description of what user wants",
  "suggestedTools": ["tool1", "tool2"],
  "rewrittenQuery": "improved query for better results",
  "reasoning": "why you chose these tools"
}

Rules:
1. Call MULTIPLE tools when the query involves both internal evidence AND external research
2. Examples of multi-tool queries:
   - "Research online about my missing evidence" → ["web_search", "query_compliance_status"]
   - "What do I need for safeguarding?" → ["query_compliance_status", "web_search"]
   - "Find my training records and CQC requirements" → ["search_evidence", "web_search"]
3. Suggest at least one tool for any query about evidence, compliance, or regulations
4. Keep rewrittenQuery concise and search-friendly`;

    try {
      const routerResponse: any = await this.runLLM([
        { role: "system", content: routerPrompt },
        { role: "user", content: message },
      ]);

      const content = routerResponse.choices?.[0]?.message?.content || "";

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)```/) ||
        content.match(/```\s*([\s\S]*?)```/) ||
        content.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
      const routing = JSON.parse(jsonStr);

      return {
        primaryIntent: routing.primaryIntent || "general question",
        suggestedTools: routing.suggestedTools || [],
        rewrittenQuery: routing.rewrittenQuery || message,
      };
    } catch (err) {
      console.error("Router LLM error:", err);
      // Fallback: return empty tools, let main LLM decide
      return {
        primaryIntent: "general question",
        suggestedTools: [],
        rewrittenQuery: message,
      };
    }
  }

  // Run LLM via Cerebras API (OpenAI-compatible)
  async runLLM(messages: any[], tools: any[] | null = null) {
    const apiKey = this.env.CEREBRAS_API_KEY;
    if (!apiKey) throw new Error("CEREBRAS_API_KEY is missing");

    const body: any = {
      model: "zai-glm-4.7", // Better tool calling support than gpt-oss-120b
      messages: messages,
      temperature: 0.1,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
      body.parallel_tool_calls = true;
    }

    const response = await fetch(
      "https://api.cerebras.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Cerebras API Error: ${err}`);
    }

    return await response.json();
  }
}
