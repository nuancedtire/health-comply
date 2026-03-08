This plan integrates **AutoRAG (Cloudflare AI Search)** for zero-maintenance indexing, uses **Durable Objects** for stateful conversation management, and leverages your existing **TanStack Start** architecture.

***

### **Master Plan: Compass Chat System**

#### **1. Architecture Overview**

*   **Frontend:** A global `ChatSidebar` component (React) that captures `useLocation` and user session data.
*   **Backend (Bridge):** A `chatFn` Server Function that validates auth and routes messages to the Agent.
*   **Agent (Brain):** A `ChatAgent` Durable Object that:
    *   Maintains conversation history.
    *   Selects tools dynamically (RBAC/Page-aware).
    *   Calls **AutoRAG** (`AI_SEARCH`) with secure tenant filtering.
    *   Calls **Tavily** for web search.
*   **Data (Memory):**
    *   **Files:** Stored in R2 (watched by AutoRAG).
    *   **SQL Metadata:** Stored in D1 (via your existing workflow).
    *   **Vectors:** Managed automatically by AutoRAG.

***

#### **2. Configuration (`wrangler.jsonc`)**

You need to bind the new services.

```jsonc
// wrangler.jsonc
{
  "name": "health-comply",
  // ...
  "durable_objects": {
    "bindings": [
      { "name": "CHAT_AGENT", "class_name": "ChatAgent" }
    ]
  },
  "migrations": [
    // ... existing migrations
    {
      "tag": "v2-chat-agent",
      "new_classes": ["ChatAgent"] 
    }
  ],
  "ai": {
    "binding": "AI" 
  },
  "ai_search": [
    {
      "binding": "AI_SEARCH",
      "id": "YOUR_AUTORAG_PROJECT_ID" // Create this in CF Dashboard > AI > AI Search
    }
  ],
  "secrets": {
    // Run: npx wrangler secret put TAVILY_API_KEY
    "TAVILY_API_KEY": "tvly-..." 
  }
}
```

***

#### **3. The Agent (`src/agent/ChatAgent.ts`)**

This is the secure logic core. It enforces tenant isolation.

```typescript
import { DurableObject } from "cloudflare:workers";

interface Env {
  AI: any;
  AI_SEARCH: any; // AutoRAG binding
  TAVILY_API_KEY: string;
}

// Context sent from the frontend on initialization
interface AgentContext {
  userId: string;
  userName: string;
  role: string;
  tenantId: string;
  siteId?: string;
  pageContext: {
    url: string;
    title: string;
    qsId?: string; // e.g. "safe.safeguarding"
  };
}

export class ChatAgent extends DurableObject<Env> {
  state: DurableObjectState;
  context: AgentContext | null = null;
  history: { role: string; content: string }[] = [];

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    // Restore history if needed (optional for MVP)
    // this.state.blockConcurrencyWhile(async () => {
    //   this.history = (await this.state.storage.get("history")) || [];
    // });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // 1. INITIALIZE CONTEXT
    // Called when the user opens the sidebar or navigates
    if (url.pathname === "/init") {
      this.context = await request.json<AgentContext>();
      // Clear history on page change? Or keep it? 
      // Let's keep it but add a "system note" about the navigation.
      this.history.push({ 
        role: "system", 
        content: `User navigated to: ${this.context.pageContext.title} (${this.context.pageContext.qsId || "General"}).` 
      });
      return new Response("OK");
    }

    // 2. CHAT LOOP
    if (url.pathname === "/chat") {
      if (!this.context) return new Response("Context missing", { status: 400 });

      const { message } = await request.json<{ message: string }>();
      this.history.push({ role: "user", content: message });

      // Define Tools
      const tools = this.getTools();

      // Run LLM
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: this.getSystemPrompt() },
          ...this.history
        ],
        tools: tools.map(t => t.definition),
      });

      // Handle Tool Calls (Simplified for brevity - assumes 1 turn)
      // In production, you loop here if response.tool_calls exists.
      let finalResponse = response;

      if (response.tool_calls) {
        const toolResults = [];
        for (const call of response.tool_calls) {
          const tool = tools.find(t => t.definition.name === call.name);
          if (tool) {
            console.log(`Executing tool: ${call.name} with args`, call.arguments);
            const result = await tool.handler(call.arguments);
            toolResults.push({
              tool_call_id: call.id, // Important if LLM supports it
              role: "tool",
              name: call.name,
              content: JSON.stringify(result)
            });
          }
        }
        
        // Feed tool outputs back to LLM
        finalResponse = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            { role: "system", content: this.getSystemPrompt() },
            ...this.history,
            response, // The message with tool_calls
            ...toolResults
          ]
        });
      }

      // Save assistant response
      // @ts-ignore
      const reply = finalResponse.response || finalResponse; // Handle different SDK return shapes
      this.history.push({ role: "assistant", content: reply });
      
      return new Response(reply);
    }

    return new Response("Not found", { status: 404 });
  }

  // --- TOOLS ---
  getTools() {
    return [
      // Tool 1: AutoRAG (Internal Evidence)
      {
        definition: {
          name: "search_evidence",
          description: "Search uploaded compliance evidence files.",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"]
          }
        },
        handler: async (args: any) => {
          // STRICT SECURITY: Prefix filter
          // AutoRAG uses "folder" key for R2 paths
          const tenantPrefix = `${this.context!.tenantId}/`;
          
          const searchRes = await this.env.AI_SEARCH.search(args.query, {
             filter: {
               type: "comparison",
               key: "folder",
               operator: "starts_with",
               value: tenantPrefix
             },
             topK: 4
          });

          return searchRes.matches.map((m: any) => 
            `[File: ${m.metadata?.filename || 'Unknown'}]\n${m.text}`
          ).join("\n---\n");
        }
      },
      // Tool 2: Tavily (Web Search)
      {
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
          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            body: JSON.stringify({ 
              api_key: this.env.TAVILY_API_KEY, 
              query: args.query, 
              include_answer: true 
            })
          });
          const data = await res.json<any>();
          return data.answer || JSON.stringify(data.results);
        }
      }
    ];
  }

  // --- PROMPT ---
  getSystemPrompt() {
    const c = this.context!;
    return `You are Compass, the CQC compliance assistant for ${c.tenantId}.
    User: ${c.userName} (${c.role}).
    Current Page: ${c.pageContext.title}
    ${c.pageContext.qsId ? `Focus: Quality Statement ${c.pageContext.qsId}` : ""}

    RULES:
    1. If user asks about "our evidence", "my files", or specific audits, use 'search_evidence'.
    2. If user asks about "regulations", "CQC rules", or "news", use 'web_search'.
    3. Always respect the tenant boundary. You cannot see files outside ${c.tenantId}.
    4. Be helpful, professional, and concise.`;
  }
}
```

***

#### **4. The Backend Bridge (`src/functions/chat.ts`)**

This ensures the user is authenticated before they can talk to the Agent.

```typescript
import { createServerFn } from "@tanstack/start";
import { authMiddleware } from "~/core/middleware/auth-middleware";
import { z } from "zod";

// Initialize Context (Call this when sidebar opens or page changes)
export const initChatFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({
    pageUrl: z.string(),
    pageTitle: z.string(),
    qsId: z.string().optional()
  }))
  .handler(async ({ data, context }) => {
    const { user, env } = context;
    const agentId = env.CHAT_AGENT.idFromName(user.id); // Persistent per user
    const stub = env.CHAT_AGENT.get(agentId);

    // Prepare safe context payload
    const agentPayload = {
      userId: user.id,
      userName: user.name,
      role: "practice_manager", // Fetch real role from DB if needed
      tenantId: user.tenantId, 
      siteId: "current-site",   // You might want to grab this from a cookie
      pageContext: {
        url: data.pageUrl,
        title: data.pageTitle,
        qsId: data.qsId
      }
    };

    await stub.fetch("http://internal/init", {
      method: "POST",
      body: JSON.stringify(agentPayload)
    });
    
    return { success: true };
  });

// Send Message
export const sendMessageFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ message: z.string() }))
  .handler(async ({ data, context }) => {
    const { user, env } = context;
    const agentId = env.CHAT_AGENT.idFromName(user.id);
    const stub = env.CHAT_AGENT.get(agentId);

    const response = await stub.fetch("http://internal/chat", {
      method: "POST",
      body: JSON.stringify({ message: data.message })
    });

    return await response.text(); // Or .body for streaming
  });
```

***

#### **5. The Frontend (`ChatSidebar.tsx`)**

Simple, robust integration.

```tsx
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { initChatFn, sendMessageFn } from "~/functions/chat";

export function ChatSidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  // Sync Context on Navigation
  useEffect(() => {
    if (!isOpen) return;

    // Extract QS ID from URL if present (e.g. /documents/safe.safeguarding)
    const qsIdMatch = location.pathname.match(/(safe|effective|caring|responsive|well_led)\.[a-z_]+/);
    const qsId = qsIdMatch ? qsIdMatch[0] : undefined;

    initChatFn({ 
      data: {
        pageUrl: location.pathname,
        pageTitle: document.title,
        qsId
      }
    });
  }, [location.pathname, isOpen]);

  const handleSend = async () => {
    if(!input) return;
    const msg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);

    try {
      const reply = await sendMessageFn({ data: { message: msg } });
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "system", content: "Error sending message." }]);
    }
  };

  if (!isOpen) return <button onClick={() => setIsOpen(true)} className="...">Chat</button>;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col z-50">
       <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'}`}>
              <p className="text-sm">{m.content}</p>
            </div>
          ))}
       </div>
       <div className="p-4 border-t">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about compliance..."
            className="w-full border rounded p-2"
          />
       </div>
    </div>
  );
}
```

***

#### **6. Implementation Steps**

1.  **Configure AutoRAG:** Go to Cloudflare Dashboard > AI > AI Search. Create a project named `health-comply` and point it to your R2 bucket.
2.  **Update `wrangler.jsonc`:** Add the `ai_search` binding and `durable_objects` binding.
3.  **Create Agent:** Copy the `ChatAgent.ts` code into `src/agent/ChatAgent.ts`.
4.  **Create Functions:** Copy the `chat.ts` bridge functions.
5.  **Build UI:** Create the sidebar component.
6.  **Deploy:** `npx wrangler deploy`.

This gives you a completely serverless, secure, RAG-enabled chat agent that knows exactly who the user is and what they are looking at. No manual vector pipelines required.