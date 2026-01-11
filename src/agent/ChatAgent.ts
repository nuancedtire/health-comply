import { DurableObject } from "cloudflare:workers";

interface Env {
    AI: any;
    EXA_API_KEY?: string;
    [key: string]: any;
}

// Context sent from the frontend on initialization
export interface AgentContext {
    userId: string;
    userName: string;
    role: string;
    tenantId: string;
    tenantName: string;
    siteId?: string;
    siteName: string;
    pageContext: {
        url: string;
        title: string;
        qsId?: string; // e.g. "safe.safeguarding"
    };
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

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;
        // Restore history
        this.state.blockConcurrencyWhile(async () => {
            this.history = (await this.state.storage.get("history")) || [];
            this.context = (await this.state.storage.get("context")) || null;
        });
    }

    async fetch(request: Request) {
        const url = new URL(request.url);

        // 1. INITIALIZE CONTEXT
        if (url.pathname === "/init") {
            this.context = await request.json<AgentContext>();
            // Update stored context so the system prompt always reflects the current page
            await this.state.storage.put("context", this.context);
            return new Response("OK");
        }

        // 2. CHAT LOOP
        if (url.pathname === "/chat") {
            if (!this.context) return new Response("Context missing", { status: 400 });

            const { message } = await request.json<{ message: string }>();
            this.history.push({ role: "user", content: message });
            await this.saveHistory();

            const tools = this.getTools();
            const steps: any[] = []; // Capture tool execution steps

            // Run LLM
            let response = await this.env.AI.run(
                "@cf/meta/llama-3.1-8b-instruct",
                {
                    messages: [
                        { role: "system", content: this.getSystemPrompt() },
                        ...this.history
                    ],
                    tools: tools.map(t => t.definition)
                },
                {
                    gateway: {
                        id: "compass-chat",
                        skipCache: false,
                        cacheTtl: 3360,
                    }
                }
            );

            // Save the tool call request to history so it persists
            // @ts-ignore
            if (response.tool_calls && response.tool_calls.length > 0) {
                this.history.push({
                    role: "assistant",
                    content: (response as any).response || "",
                    // @ts-ignore
                    tool_calls: response.tool_calls
                });
                await this.saveHistory();
            }

            // Handle Tool Calls
            let finalContent = "";

            if (response.tool_calls && response.tool_calls.length > 0) {
                const toolResults = [];
                for (const call of response.tool_calls) {
                    const tool = tools.find(t => t.definition.name === call.name);
                    if (tool) {
                        // Record step start
                        const stepInfo = {
                            tool: call.name,
                            input: call.arguments,
                            output: "",
                            sources: [] as any[]
                        };

                        try {
                            // Execute tool - now returns Object { text, sources }
                            const result = await tool.handler(call.arguments);

                            // result might be string (legacy/error) or object
                            const textContent = typeof result === 'string' ? result : result.text;
                            const sources = typeof result === 'object' ? result.sources : [];

                            stepInfo.output = textContent;
                            stepInfo.sources = sources;

                            const toolResultMsg = {
                                role: "tool",
                                name: call.name,
                                tool_call_id: call.id,
                                content: JSON.stringify({
                                    text: textContent,
                                    sources: sources
                                })
                            };

                            toolResults.push(toolResultMsg);
                            // IMPORTANT: Save tool result to history so sources persist on reload
                            this.history.push(toolResultMsg);

                        } catch (err: any) {
                            stepInfo.output = `Error: ${err.message}`;
                            const errorMsg = {
                                role: "tool",
                                name: call.name,
                                tool_call_id: call.id,
                                content: `Error: ${err.message}`
                            };
                            toolResults.push(errorMsg);
                            this.history.push(errorMsg);
                        }
                        steps.push(stepInfo);
                    }
                }

                // Save history after all tools run
                await this.saveHistory();

                try {
                    // Feed back to LLM
                    response = await this.env.AI.run(
                        "@cf/meta/llama-3.1-8b-instruct",
                        {
                            messages: [
                                { role: "system", content: this.getSystemPrompt() },
                                ...this.history
                            ]
                        },
                        {
                            gateway: {
                                id: "compass-chat",
                                skipCache: false,
                                cacheTtl: 3360,
                            }
                        }
                    );
                } catch (err: any) {
                    console.error("Error in AI tool loop:", err);
                    // Return a valid JSON error so frontend doesn't break
                    return new Response(JSON.stringify({
                        content: `AI Error during processing: ${err.message}`,
                        steps
                    }));
                }
            }

            // Extract final response
            finalContent = response.response || response;

            this.history.push({ role: "assistant", content: finalContent });
            await this.saveHistory();

            // Return Structured Response
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
    }

    // --- TOOLS ---
    getTools() {
        // Always include web search if key happens to be present, but we prioritize internal first in prompt
        const tools = [
            // Tool 1: AutoRAG (Internal Evidence)
            {
                definition: {
                    name: "search_evidence",
                    description: "Search uploaded compliance evidence files in the specific tenant.",
                    parameters: {
                        type: "object",
                        properties: { query: { type: "string" } },
                        required: ["query"]
                    }
                },
                handler: async (args: any) => {
                    // Strict prefix matching upload path: t/{tenantId}/s/{siteId}/
                    const tenantId = this.context!.tenantId;
                    const siteId = this.context!.siteId;

                    let searchPrefix = `t/${tenantId}/`;
                    // If we have a specific site context, narrow it down
                    if (siteId && siteId !== "current-site") {
                        searchPrefix = `t/${tenantId}/s/${siteId}/`;
                    }

                    // Construct "Starts With" filter using compound rules
                    // We need to match folder >= searchPrefix AND folder <= searchPrefix + 'z' (roughly)
                    // The 'folder' metadata in our index corresponds to the path prefix.

                    const filters = {
                        type: "and",
                        filters: [
                            {
                                type: "gte",
                                key: "folder",
                                value: searchPrefix
                            },
                            {
                                type: "lte",
                                key: "folder",
                                value: searchPrefix + "\uffff" // High unicode char to cover all suffixes
                            }
                        ]
                    };

                    try {
                        // Pass filters to autorag search
                        const searchRes = await this.env.AI.autorag("health-comply").search({
                            query: args.query,
                            topK: 4,
                            filters: filters
                        });

                        if (!searchRes || !searchRes.data || searchRes.data.length === 0) {
                            return { text: "No matching evidence found in your context.", sources: [] };
                        }

                        const relevantMatches = searchRes.data;

                        // Prepare Sources
                        const sources = relevantMatches.map((m: any) => ({
                            title: m.metadata?.filename?.split('/').pop() || 'Unknown File',
                            href: '#',
                            type: 'file'
                        }));

                        // @ts-ignore
                        const text = relevantMatches.map(m => `[File: ${m.metadata?.filename}]\n${m.text}`).join("\n---\n");

                        return { text, sources };
                    } catch (e: any) {
                        return { text: `Error searching evidence: ${e.message}`, sources: [] };
                    }
                }
            },
        ];

        if (this.env.EXA_API_KEY) {
            tools.push({
                definition: {
                    name: "web_search",
                    description: "Search the public internet for CQC regulations, news, or clinical guidelines.",
                    parameters: {
                        type: "object",
                        properties: { query: { type: "string" } },
                        required: ["query"]
                    }
                },
                handler: async (args: any) => {
                    if (!this.env.EXA_API_KEY) return { text: "Web search disabled (No API Key).", sources: [] };

                    try {
                        const res = await fetch("https://api.exa.ai/search", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "x-api-key": this.env.EXA_API_KEY
                            },
                            body: JSON.stringify({
                                query: args.query,
                                numResults: 3,
                                useAutoprompt: true,
                                contents: { text: true }
                            })
                        });
                        const data = await res.json<any>();

                        if (data.results) {
                            const text = data.results.map((r: any) =>
                                `[Title: ${r.title}]\n[URL: ${r.url}]\n${r.text.slice(0, 10000)}...`
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
            });
        }

        return tools;
    }

    // --- PROMPT ---
    getSystemPrompt() {
        const c = this.context!;
        if (!c) return "You are a helpful assistant.";

        return `You are Compass, the CQC compliance assistant for ${c.tenantName} (${c.siteName}).
    User: ${c.userName} (${c.role}).
    Current Page: ${c.pageContext.title}
    ${c.pageContext.qsId ? `Focus: Quality Statement ${c.pageContext.qsId}` : ""}

    RULES:
    1. If user asks about "our evidence", "my files", or specific audits, use 'search_evidence'.
    2. IF web search is enabled (user requested it), use 'web_search' for external regulations/news. Otherwise, decline if unknown.
    3. Be friendly, helpful, professional, and concise.
    4. You do not always need to use a tool if you can answer directly.
    5. Use tools only when necessary.`;
    }
}
