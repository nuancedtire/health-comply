"use client";

export const title = "React AI Task";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  SearchIcon, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Terminal,
  ChevronRight
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type TaskStatus = "running" | "completed" | "failed" | "result";

export type TaskProps = ComponentProps<typeof Collapsible> & {
  status?: TaskStatus;
};

export const Task = ({
  defaultOpen = false,
  className,
  status,
  ...props
}: TaskProps) => (
  <Collapsible 
    className={cn("w-full", className)} 
    defaultOpen={defaultOpen} 
    {...props} 
  />
);

export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: ReactNode;
  status?: TaskStatus;
  icon?: ReactNode;
};

export const TaskTrigger = ({
  children,
  className,
  title,
  status = "completed",
  icon,
  ...props
}: TaskTriggerProps) => {
  const getStatusIcon = () => {
    if (icon) return icon;
    switch (status) {
      case "running":
        return <Loader2 className="size-3 animate-spin text-indigo-500" />;
      case "completed":
      case "result":
        return <CheckCircle2 className="size-3 text-emerald-500" />;
      case "failed":
        return <XCircle className="size-3 text-red-500" />;
      default:
        return <SearchIcon className="size-3" />;
    }
  };

  return (
    <CollapsibleTrigger asChild className={cn("group", className)} {...props}>
      {children ?? (
        <div className="flex inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer w-fit max-w-full shadow-sm hover:shadow-md active:scale-[0.98]">
          {getStatusIcon()}
          <span className="truncate max-w-[150px]">{title}</span>
          <ChevronRight className="size-3 transition-transform group-data-[state=open]:rotate-90 text-muted-foreground/50" />
        </div>
      )}
    </CollapsibleTrigger>
  );
};

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>;

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  >
    <div className="mt-2 space-y-4 rounded-lg border bg-muted/20 p-3 ml-2">
      {children}
    </div>
  </CollapsibleContent>
);

export type TaskItemProps = ComponentProps<"div">;

export const TaskItem = ({ children, className, ...props }: TaskItemProps) => (
  <div className={cn("flex flex-col gap-2", className)} {...props}>
    {children}
  </div>
);

export const TaskCodeBlock = ({ 
  label, 
  value, 
  language = "json" 
}: { 
  label: string; 
  value: any; 
  language?: string 
}) => {
  const [copied, setCopied] = useState(false);
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
          <Terminal className="size-3" />
          {label} {language !== "json" && `(${language})`}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5 hover:bg-muted" 
          onClick={handleCopy}
        >
          {copied ? <CheckCircle2 className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <pre className="relative overflow-auto rounded-md bg-zinc-950 p-3 text-[11px] font-mono leading-relaxed text-zinc-300 dark:bg-zinc-900/50 max-h-[300px]">
        <code>{text}</code>
      </pre>
    </div>
  );
};
