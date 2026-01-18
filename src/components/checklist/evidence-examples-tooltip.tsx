import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceExamples {
    good: string[];
    bad: string[];
}

interface EvidenceExamplesTooltipProps {
    evidenceExamples: string | EvidenceExamples | null | undefined;
    cqcMythbusterUrl?: string | null;
    className?: string;
}

export function EvidenceExamplesTooltip({ 
    evidenceExamples, 
    cqcMythbusterUrl,
    className 
}: EvidenceExamplesTooltipProps) {
    let examples: EvidenceExamples | null = null;
    
    if (typeof evidenceExamples === 'string') {
        try {
            examples = JSON.parse(evidenceExamples);
        } catch {
            examples = null;
        }
    } else if (evidenceExamples && typeof evidenceExamples === 'object') {
        examples = evidenceExamples as EvidenceExamples;
    }
    
    if (!examples && !cqcMythbusterUrl) return null;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <button 
                        type="button"
                        className={cn(
                            "inline-flex items-center justify-center rounded-full p-1 hover:bg-muted transition-colors",
                            className
                        )}
                    >
                        <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                    </button>
                </TooltipTrigger>
                <TooltipContent 
                    side="top" 
                    align="start" 
                    className="max-w-sm p-0 overflow-hidden"
                >
                    <div className="p-3 space-y-3">
                        {examples?.good && examples.good.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Good Evidence
                                </div>
                                <ul className="space-y-1">
                                    {examples.good.map((item, i) => (
                                        <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-emerald-500">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {examples?.bad && examples.bad.length > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                                    <XCircle className="h-3 w-3" />
                                    Avoid
                                </div>
                                <ul className="space-y-1">
                                    {examples.bad.map((item, i) => (
                                        <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-rose-500">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {cqcMythbusterUrl && (
                            <a 
                                href={cqcMythbusterUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline pt-1 border-t"
                            >
                                <ExternalLink className="h-3 w-3" />
                                CQC Guidance
                            </a>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

interface EvidenceExamplesSectionProps {
    evidenceExamples: string | EvidenceExamples | null | undefined;
    cqcMythbusterUrl?: string | null;
    className?: string;
    variant?: "default" | "minimal";
}

export function EvidenceExamplesSection({ 
    evidenceExamples, 
    cqcMythbusterUrl,
    className,
    variant = "default"
}: EvidenceExamplesSectionProps) {
    let examples: EvidenceExamples | null = null;
    
    if (typeof evidenceExamples === 'string') {
        try {
            examples = JSON.parse(evidenceExamples);
        } catch {
            examples = null;
        }
    } else if (evidenceExamples && typeof evidenceExamples === 'object') {
        examples = evidenceExamples as EvidenceExamples;
    }
    
    if (!examples && !cqcMythbusterUrl) return null;

    if (variant === "minimal") {
        return (
            <div className={cn("space-y-4", className)}>
                <div className="grid gap-4 sm:grid-cols-2">
                    {examples?.good && examples.good.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Good Evidence
                            </div>
                            <ul className="space-y-1.5">
                                {examples.good.map((item, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                        <span className="text-emerald-500 mt-0.5">•</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {examples?.bad && examples.bad.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                                <XCircle className="h-3.5 w-3.5" />
                                Avoid
                            </div>
                            <ul className="space-y-1.5">
                                {examples.bad.map((item, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                        <span className="text-rose-500 mt-0.5">•</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                
                {cqcMythbusterUrl && (
                    <a 
                        href={cqcMythbusterUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View CQC Guidance
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className={cn("rounded-lg border bg-muted/30 p-4 space-y-4", className)}>
            <h4 className="font-medium text-sm">Evidence Guidance</h4>
            
            <div className="grid gap-4 sm:grid-cols-2">
                {examples?.good && examples.good.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Good Evidence
                        </div>
                        <ul className="space-y-1.5">
                            {examples.good.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-emerald-500 mt-1">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {examples?.bad && examples.bad.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
                            <XCircle className="h-4 w-4" />
                            Avoid
                        </div>
                        <ul className="space-y-1.5">
                            {examples.bad.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-rose-500 mt-1">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            
            {cqcMythbusterUrl && (
                <a 
                    href={cqcMythbusterUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                    <ExternalLink className="h-4 w-4" />
                    View CQC Guidance
                </a>
            )}
        </div>
    );
}
