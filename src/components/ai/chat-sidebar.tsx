"use client";

import {
    MessageBranch,
    MessageBranchContent,
} from "@/components/ai/message";
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai/conversation";
import { Message, MessageContent } from "@/components/ai/message";
import {
    PromptInput,
    PromptInputBody,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    type PromptInputMessage,
} from "@/components/ai/prompt-input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageResponse } from "@/components/ai/message";
import {
    Source,
    Sources,
    SourcesContent,
    SourcesTrigger,
} from "@/components/ai/sources";
import {
    Task,
    TaskContent,
    TaskItem,
    TaskTrigger,
    TaskCodeBlock,
    type TaskStatus,
} from "@/components/ai/task";
import { GlobeIcon, MessageSquare, X, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useState, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { initChatFn, sendMessageFn, getChatHistoryFn, clearChatFn } from "@/core/functions/chat-functions";
import { Button } from "@/components/ui/button";
import { useSite } from "@/components/site-context";
import { Trash } from "lucide-react";

type MessageType = {
    key: string;
    from: "user" | "assistant";
    sources?: { href: string; title: string }[];
    versions: {
        id: string;
        content: string;
    }[];
    reasoning?: {
        content: string;
        duration: number;
    };
    tools?: {
        name: string;
        description: string;
        status: TaskStatus;
        parameters: Record<string, unknown>;
        result: string | undefined;
        error: string | undefined;
    }[];
};

const initialMessages: MessageType[] = [
    {
        key: "init",
        from: "assistant",
        versions: [
            {
                id: "init-v1",
                content: "Hello! I'm Compass, your compliance assistant. How can I help you today?",
            },
        ],
    },
];

export function ChatSidebar() {
    const location = useLocation();
    const { activeSite } = useSite();
    const [isOpen, setIsOpen] = useState(false);

    const [text, setText] = useState<string>("");
    const [status, setStatus] = useState<
        "submitted" | "streaming" | "ready" | "error"
    >("ready");
    const [messages, setMessages] = useState<MessageType[]>(initialMessages);
    const [lastInitializedPath, setLastInitializedPath] = useState<string>("");
    const [sidebarWidth, setSidebarWidth] = useState(450);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    // Initialize/Update Chat Context on Sidebar Open OR Navigation
    useEffect(() => {
        // Only run if sidebar is open
        if (!isOpen) return;

        // Must have an active site to use chat
        if (!activeSite?.id) {
            setMessages([{
                key: "no-site",
                from: "assistant",
                versions: [{ id: "no-site-v1", content: "Please select a site from the team switcher to use the compliance assistant." }]
            }]);
            return;
        }

        // Run if we haven't initialized for this specific path yet
        if (location.pathname !== lastInitializedPath) {
            // Add a small delay to allow document.title to update after navigation
            const timer = setTimeout(() => {
                const qsIdMatch = location.pathname.match(/(safe|effective|caring|responsive|well_led)\.[a-z_]+/);
                const qsId = qsIdMatch ? qsIdMatch[0] : undefined;

                initChatFn({
                    data: {
                        pageUrl: location.pathname,
                        pageTitle: document.title,
                        siteId: activeSite.id,
                        qsId
                    }
                }).then(() => {
                    setLastInitializedPath(location.pathname);
                    // Fetch History
                    return getChatHistoryFn();
                }).then((res: any) => {
                    if (res?.history && Array.isArray(res.history)) {
                        const mappedMessages: MessageType[] = [];

                        if (res.history.length === 0) {
                            setMessages(initialMessages);
                            return;
                        }

                        const toolMap = new Map<string, any>(); // call_id -> { toolObj, msgKey }

                        res.history.forEach((h: any) => {
                            const key = nanoid();

                            if (h.role === 'user') {
                                mappedMessages.push({
                                    key,
                                    from: 'user',
                                    versions: [{ id: key, content: h.content }]
                                });
                            }
                            else if (h.role === 'assistant') {
                                const lastMsg = mappedMessages[mappedMessages.length - 1];
                                // Check if we should merge into previous assistant message
                                // We merge if:
                                // 1. Previous msg is assistant
                                // 2. Previous msg has tools (it was a tool caller)
                                // 3. We assume this is the continuation (Answer or Next Tool Step)

                                const shouldMerge = lastMsg &&
                                    lastMsg.from === 'assistant' &&
                                    (lastMsg.tools?.length ?? 0) > 0;

                                let targetMsg: MessageType; // Use partial type for manipulation
                                let msgKey: string;

                                if (shouldMerge) {
                                    targetMsg = lastMsg!;
                                    msgKey = targetMsg.key;
                                    // If current has content, update target (Overwrite previous "thinking" text)
                                    if (h.content) {
                                        targetMsg.versions[0].content = h.content;
                                    }
                                } else {
                                    // Create new
                                    msgKey = nanoid();
                                    targetMsg = {
                                        key: msgKey,
                                        from: 'assistant',
                                        versions: [{ id: msgKey, content: h.content || "" }],
                                        tools: undefined, // Will be init below
                                        sources: undefined
                                    };
                                    mappedMessages.push(targetMsg);
                                }

                                if (h.tool_calls && Array.isArray(h.tool_calls)) {
                                    if (!targetMsg.tools) targetMsg.tools = [];

                                    h.tool_calls.forEach((tc: any) => {
                                        const toolObj = {
                                            name: tc.name,
                                            description: "",
                                            status: "result",
                                            parameters: tc.arguments,
                                            result: "Processed",
                                            call_id: tc.id
                                        };
                                        // @ts-ignore
                                        targetMsg.tools.push(toolObj);
                                        toolMap.set(tc.id, { toolObj, msgKey });
                                    });
                                }
                            }
                            else if (h.role === 'tool') {
                                const mapEntry = toolMap.get(h.tool_call_id);
                                if (mapEntry) {
                                    const { toolObj, msgKey } = mapEntry;
                                    let outputText = h.content;
                                    let sources: any[] = [];

                                    try {
                                        const parsed = JSON.parse(h.content);
                                        if (parsed && typeof parsed === 'object' && 'text' in parsed) {
                                            outputText = parsed.text;
                                            if (parsed.sources && Array.isArray(parsed.sources)) {
                                                sources = parsed.sources;
                                            }
                                        } else {
                                            outputText = parsed;
                                        }
                                    } catch (e) { }

                                    toolObj.result = outputText;
                                    if (typeof outputText === 'string' && outputText.startsWith("Error:")) {
                                        toolObj.error = outputText;
                                    }

                                    // Update message sources
                                    if (sources.length > 0) {
                                        const msg = mappedMessages.find(m => m.key === msgKey);
                                        if (msg) {
                                            msg.sources = [...(msg.sources || []), ...sources];
                                        }
                                    }
                                }
                            }
                        });

                        if (mappedMessages.length > 0) setMessages(mappedMessages);
                    }
                }).catch((err: any) => {
                    console.error("Chat init/history failed", err);
                });
            }, 300); // 300ms delay to ensure DOM title is updated

            return () => clearTimeout(timer);
        }
    }, [isOpen, location.pathname, activeSite?.id, lastInitializedPath]);

    // Drag to resize handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const newWidth = window.innerWidth - e.clientX;
            setSidebarWidth(Math.max(320, Math.min(800, newWidth)));
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const handleDragStart = () => {
        isDragging.current = true;
        document.body.style.cursor = "ew-resize";
        document.body.style.userSelect = "none";
    };

    const addUserMessage = useCallback(
        async (content: string) => {
            // 1. Add User Message to UI
            const userMsgKey = `user-${nanoid()}`;
            const userMessage: MessageType = {
                key: userMsgKey,
                from: "user",
                versions: [{ id: userMsgKey, content }],
            };

            setMessages((prev) => [...prev, userMessage]);
            setStatus("streaming");

            // 2. Add Placeholder Assistant Message
            const assistantMsgKey = `assistant-${nanoid()}`;
            const assistantMessage: MessageType = {
                key: assistantMsgKey,
                from: "assistant",
                versions: [{ id: assistantMsgKey, content: "···" }],
            };
            setMessages((prev) => [...prev, assistantMessage]);

            try {
                // 3. Backend Call
                const response = await sendMessageFn({ data: { message: content } });

                // Response shape: { content: string, steps: Array }
                const finalContent = response.content;
                const steps = response.steps || [];

                // Extract sources from steps
                // Each step has sources: [{ title, href, type }]
                const allSources: any[] = [];
                const toolSteps: any[] = [];

                steps.forEach((step: any) => {
                    // Map step to tool
                    toolSteps.push({
                        name: step.tool,
                        description: "",
                        status: "result", // Completed
                        parameters: step.input,
                        result: step.output,
                        error: step.output.startsWith("Error:") ? step.output : undefined
                    });

                    if (step.sources && Array.isArray(step.sources)) {
                        allSources.push(...step.sources);
                    }
                });

                // 4. Update Assistant Message
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (msg.key === assistantMsgKey) {
                            return {
                                ...msg,
                                tools: toolSteps.length > 0 ? toolSteps : undefined,
                                sources: allSources.length > 0 ? allSources : undefined,
                                versions: [{ id: assistantMsgKey, content: finalContent }]
                            };
                        }
                        return msg;
                    })
                );
            } catch (error) {
                console.error("Chat error", error);
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (msg.key === assistantMsgKey) {
                            return {
                                ...msg,
                                versions: [{ id: assistantMsgKey, content: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }]
                            };
                        }
                        return msg;
                    })
                );
            } finally {
                setStatus("ready");
            }
        },
        []
    );

    const handleSubmit = (message: PromptInputMessage) => {
        if (!message.text && !message.files?.length) return;
        setStatus("submitted");
        addUserMessage(message.text || "Sent with attachments");
        setText("");
    };

    // Close sidebar when clicking outside
    const handleOverlayClick = () => {
        setIsOpen(false);
    };

    return (
        <>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <div 
                        className="fixed inset-0 bg-black/20 z-40 animate-in fade-in"
                        onClick={handleOverlayClick}
                    />
                    
                    {/* FAB Button (outside sidebar) */}
                    <Button
                        onClick={() => setIsOpen(true)}
                        size="icon"
                        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground z-50 animate-in fade-in zoom-in"
                    >
                        <MessageSquare className="h-7 w-7" />
                    </Button>
                </>
            )}

            {/* Floating button when closed */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    size="icon"
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground z-50 animate-in fade-in zoom-in"
                >
                    <MessageSquare className="h-7 w-7" />
                </Button>
            )}

            {isOpen && (
                <div 
                    ref={sidebarRef}
                    className="fixed inset-y-0 right-0 bg-background shadow-2xl z-50 flex flex-col border-l animate-in slide-in-from-right duration-300"
                    style={{ width: sidebarWidth }}
                >
                    {/* Drag Handle - full height, more visible */}
                    <div 
                        className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize group z-10"
                        onMouseDown={handleDragStart}
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex flex-col gap-1">
                                <div className="w-1 h-3 bg-muted-foreground/40 rounded-full" />
                                <div className="w-1 h-3 bg-muted-foreground/40 rounded-full" />
                                <div className="w-1 h-3 bg-muted-foreground/40 rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <h2 className="font-semibold text-base flex items-center gap-2.5">
                            <span className="p-1.5 bg-primary/10 text-primary rounded-md">
                                <MessageSquare className="w-4 h-4" />
                            </span>
                            Compass AI
                        </h2>
                        <div className="flex items-center gap-1">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" title="Clear History">
                                        <Trash className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete your current conversation history. You cannot undo this action.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={async () => {
                                            await clearChatFn();
                                            setMessages(initialMessages);
                                        }} className="bg-red-600 hover:bg-red-700 text-white">
                                            Clear History
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-hidden relative flex flex-col">
                        <Conversation className="h-full">
                            <ConversationContent>
                                {messages.map(({ versions, ...message }) => (
                                    <MessageBranch defaultBranch={0} key={message.key}>
                                        <MessageBranchContent>
                                            {versions.map((version) => (
                                                <Message
                                                    from={message.from}
                                                    key={`${message.key}-${version.id}`}
                                                >
                                                    <div>
                                                        <div className={cn(
                                                            "text-[10px] font-semibold uppercase tracking-wider mb-1",
                                                            message.from === 'user'
                                                                ? "text-right text-muted-foreground"
                                                                : "text-primary"
                                                        )}>
                                                            {message.from === 'user' ? 'You' : 'Compass'}
                                                        </div>
                                                        <MessageContent>
                                                            <MessageResponse>{version.content}</MessageResponse>
                                                        </MessageContent>

                                                        {/* Task / Tools Display */}
                                                        {message.tools && message.tools.length > 0 && (() => {
                                                            const allCompleted = message.tools.every(t => t.status === 'result' || t.status === 'completed');
                                                            const anyFailed = message.tools.some(t => t.error || t.status === 'failed');
                                                            
                                                            return (
                                                                <div className="mt-4 flex flex-col gap-3 border-t border-muted/50 pt-4">
                                                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-1">
                                                                        <Terminal className="size-3" />
                                                                        Tools Used
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {allCompleted && !anyFailed ? (
                                                                            <Task status="completed">
                                                                                <TaskTrigger 
                                                                                    title={`Used ${message.tools.length} tool${message.tools.length !== 1 ? 's' : ''}`} 
                                                                                    status="completed"
                                                                                />
                                                                                <TaskContent className="max-w-[400px]">
                                                                                    <div className="flex flex-col gap-4">
                                                                                        {message.tools.map((tool, idx) => (
                                                                                            <div key={idx} className={idx > 0 ? "border-t border-muted/30 pt-4" : ""}>
                                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                                    <div className="text-[10px] font-bold text-foreground uppercase bg-muted px-1.5 py-0.5 rounded">
                                                                                                        {tool.name}
                                                                                                    </div>
                                                                                                    <div className="text-[10px] text-muted-foreground italic truncate">
                                                                                                        {(tool.parameters as any)?.query || ''}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <TaskCodeBlock label="Input" value={tool.parameters} />
                                                                                                {tool.result && (
                                                                                                    <div className="mt-2">
                                                                                                        <TaskCodeBlock label="Output" value={tool.result} />
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </TaskContent>
                                                                            </Task>
                                                                        ) : (
                                                                            message.tools.map((tool, idx) => (
                                                                                <Task key={idx} status={tool.status as TaskStatus}>
                                                                                    <TaskTrigger 
                                                                                        title={tool.name} 
                                                                                        status={(tool.error || tool.status === 'failed') ? 'failed' : (tool.status as TaskStatus)}
                                                                                    />
                                                                                    <TaskContent>
                                                                                        <TaskItem>
                                                                                            <TaskCodeBlock label="Parameters" value={tool.parameters} />
                                                                                            {tool.result && <TaskCodeBlock label="Result" value={tool.result} />}
                                                                                            {tool.error && <TaskCodeBlock label="Error" value={tool.error} />}
                                                                                        </TaskItem>
                                                                                    </TaskContent>
                                                                                </Task>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Sources Display */}
                                                        {message.sources?.length && (
                                                            <div className="mt-4">
                                                                <Sources>
                                                                    <SourcesTrigger count={message.sources.length} />
                                                                    <SourcesContent>
                                                                        {message.sources.map((source, idx) => (
                                                                            <Source
                                                                                href={source.href}
                                                                                key={idx}
                                                                                title={source.title}
                                                                            />
                                                                        ))}
                                                                    </SourcesContent>
                                                                </Sources>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Message>
                                            ))}
                                        </MessageBranchContent>
                                    </MessageBranch>
                                ))}
                            </ConversationContent>
                            <ConversationScrollButton />
                        </Conversation>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <PromptInput globalDrop multiple onSubmit={handleSubmit} className="border-none shadow-none p-0">
                            <PromptInputBody className="border rounded-lg shadow-sm focus-within:ring-1 focus-within:ring-ring">
                                <PromptInputTextarea
                                    onChange={(event: any) => setText(event.target.value)}
                                    value={text}
                                    placeholder="Ask Compass anything..."
                                    className="min-h-[50px] max-h-[200px]"
                                />
                            </PromptInputBody>
                            <PromptInputFooter>
                                <PromptInputTools>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                                        <GlobeIcon size={14} className="text-primary/60" />
                                        <span>Compass AI</span>
                                    </div>
                                </PromptInputTools>
                                <PromptInputSubmit
                                    disabled={!(text.trim() || status) || status === "streaming"}
                                    status={status}
                                />
                            </PromptInputFooter>
                        </PromptInput>
                    </div>
                </div>
            )}
        </>
    );
}
