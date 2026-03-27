import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    X,
    FileText,
    FileImage,
    FileSpreadsheet,
    File,
    Download,
    Trash2,
    Loader2,
    Check,
    ChevronsUpDown,
    Wand2,
    Sparkles,
    ChevronDown,
    Calendar,
    AlertTriangle,
    Plus,
    Eye,
    Send,
    GripVertical,
    CheckCircle2,
    Link2,
    User,
    UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EvidenceItem, STATUS_CONFIG } from "./documents-view";
import { updateEvidenceFn, deleteEvidenceFn, getEvidenceReferenceDataFn } from "@/core/functions/evidence";
import { getLocalControlsFn } from "@/core/functions/local-control-functions";
import { parseCsv } from "@/utils/csv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DocumentsSidebarProps {
    evidence: EvidenceItem | null;
    onClose: () => void;
    siteId: string;
    width: number;
    onWidthChange: (width: number) => void;
    minWidth?: number;
    maxWidth?: number;
}

function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.includes("csv") || mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("word")) return FileText;
    return File;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsSidebar({
    evidence,
    onClose,
    siteId,
    width,
    onWidthChange,
    minWidth = 320,
    maxWidth = 600,
}: DocumentsSidebarProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const resizeRef = useRef<HTMLDivElement>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [evidenceDate, setEvidenceDate] = useState("");
    const [localControlId, setLocalControlId] = useState<string>("");
    const [categoryId, setCategoryId] = useState("");
    const [qsId, setQsId] = useState("");

    // UI state
    const [isControlOpen, setIsControlOpen] = useState(false);
    const [showContentPreview, setShowContentPreview] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Fetch reference data
    const { data: refData } = useQuery({
        queryKey: ["evidence-refs"],
        queryFn: () => getEvidenceReferenceDataFn(),
        enabled: !!evidence,
    });

    // Fetch local controls
    const { data: controlsData } = useQuery({
        queryKey: ["local-controls", siteId],
        queryFn: () => getLocalControlsFn({ data: { siteId } }),
        enabled: !!evidence && !!siteId,
    });

    const controls = controlsData?.controls || [];

    // Initialize form when evidence changes - INCLUDING AI matched control
    useEffect(() => {
        if (evidence) {
            setTitle(evidence.title || "");
            setSummary(evidence.summary || "");
            setEvidenceDate(evidence.evidenceDate ? format(new Date(evidence.evidenceDate), "yyyy-MM-dd") : "");
            setCategoryId(evidence.evidenceCategoryId || "");
            setQsId(evidence.qsId || "");

            // Priority: existing localControlId > AI matched control
            const effectiveControlId = evidence.localControlId ||
                evidence.classificationResult?.matchedControlId ||
                "";
            setLocalControlId(effectiveControlId);

            setHasChanges(false);
            setShowContentPreview(false);
        }
    }, [evidence?.id]);

    // Track changes
    useEffect(() => {
        if (!evidence) return;
        const initialControlId = evidence.localControlId ||
            evidence.classificationResult?.matchedControlId ||
            "";
        const changed =
            title !== (evidence.title || "") ||
            summary !== (evidence.summary || "") ||
            evidenceDate !== (evidence.evidenceDate ? format(new Date(evidence.evidenceDate), "yyyy-MM-dd") : "") ||
            localControlId !== initialControlId ||
            categoryId !== (evidence.evidenceCategoryId || "");
        setHasChanges(changed);
    }, [title, summary, evidenceDate, localControlId, categoryId, evidence]);

    // Handle resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            onWidthChange(Math.max(minWidth, Math.min(maxWidth, newWidth)));
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        if (isResizing) {
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, minWidth, maxWidth, onWidthChange]);

    // Mutations
    const updateMutation = useMutation({
        mutationFn: updateEvidenceFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evidence"] });
            queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
            toast.success("Document updated");
            setHasChanges(false);
        },
        onError: (err) => {
            toast.error("Failed to update: " + err.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEvidenceFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evidence"] });
            queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
            toast.success("Document deleted");
            onClose();
        },
        onError: (err) => {
            toast.error("Failed to delete: " + err.message);
        },
    });

    const handleSave = (submitForReview = false) => {
        if (!evidence) return;

        if (submitForReview && (!localControlId || localControlId === "none")) {
            toast.error("Please select a Local Control before submitting for review.");
            return;
        }

        updateMutation.mutate({
            data: {
                evidenceId: evidence.id,
                updates: {
                    title,
                    status: submitForReview ? "pending_review" : evidence.status,
                    summary,
                    evidenceDate: evidenceDate ? new Date(evidenceDate) : null,
                    localControlId: localControlId === "none" ? null : localControlId,
                    evidenceCategoryId: categoryId === "none" ? null : categoryId,
                    qsId: qsId || undefined,
                    reviewNotes: submitForReview
                        ? evidence.classificationResult?.type === "match"
                            ? "Auto-matched by AI and confirmed by user."
                            : "Manually assigned by user."
                        : undefined,
                },
            },
        });
    };

    const handleReject = () => {
        if (!evidence) return;
        updateMutation.mutate({
            data: {
                evidenceId: evidence.id,
                updates: {
                    status: "rejected",
                    reviewNotes: "Marked as irrelevant by user.",
                },
            },
        });
    };

    const handleCreateControl = () => {
        if (!evidence?.classificationResult) return;

        navigate({
            to: "/checklist",
            search: {
                createControl: "true",
                title: evidence.classificationResult.suggestedControlTitle,
                qsId: evidence.classificationResult.suggestedQsId,
                linkEvidenceId: evidence.id
            }
        });
    };

    if (!evidence) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground border-l bg-card">
                <FileText className="h-12 w-12 mb-4 opacity-30" />
                <h3 className="font-medium text-foreground">No document selected</h3>
                <p className="text-sm mt-1">Select a document to view details</p>
            </div>
        );
    }

    const FileIcon = getFileIcon(evidence.mimeType);
    const config = STATUS_CONFIG[evidence.status];
    const isLocked = evidence.status === "pending_review" || evidence.status === "approved";
    const isDraft = evidence.status === "draft";
    const isFailed = evidence.status === "failed";
    const isProcessing = evidence.status === "processing";

    // Find the effective control
    const effectiveControl = localControlId
        ? controls.find((c) => c.id === localControlId)
        : null;

    // Determine if AI has a SUGGESTION (new control to create) vs a MATCH (existing control)
    const classResult = evidence.classificationResult;
    const isAiMatch = classResult?.type === "match" && classResult?.matchedControlId;
    const isAiSuggestion = classResult?.type === "suggestion" && classResult?.suggestedControlTitle;

    // Show suggestion card only when:
    // - AI suggested a new control (type='suggestion')
    // - AND user hasn't manually selected a different control
    const showSuggestionCard = isAiSuggestion && !localControlId;

    return (
        <div
            className="flex flex-col h-full border-l bg-card relative"
            style={{ width: `${width}px` }}
        >
            {/* Resize Handle */}
            <div
                ref={resizeRef}
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                }}
                className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group",
                    "hover:bg-primary/20 active:bg-primary/30",
                    isResizing && "bg-primary/30"
                )}
            >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-6 w-6 text-muted-foreground" />
                </div>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b bg-muted/20">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5",
                        config.bgColor
                    )}>
                        <FileIcon className={cn("h-4.5 w-4.5", config.textColor)} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2" title={evidence.title}>
                            {evidence.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                config.bgColor, config.textColor, config.borderColor
                            )}>
                                <config.icon className={cn("h-2.5 w-2.5", config.iconClass)} />
                                {config.label}
                            </span>
                            {classResult?.confidence && (
                                <span className="text-[10px] text-muted-foreground font-medium">
                                    {classResult.confidence}% confidence
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 -mt-0.5 text-muted-foreground hover:text-foreground" onClick={onClose}>
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                    {/* Status-specific Alerts */}
                    {isDraft && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="font-medium text-amber-800 dark:text-amber-200">Action Required</p>
                                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                                    {isAiMatch
                                        ? "AI matched this document to a control. Confirm or change the assignment, then submit for review."
                                        : isAiSuggestion
                                            ? "AI couldn't find a matching control but suggests creating one. Create the control or assign manually."
                                            : "Select a local control to assign this document, then submit for review."}
                                </p>
                            </div>
                        </div>
                    )}

                    {isFailed && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="font-medium text-red-800 dark:text-red-200">Processing Failed</p>
                                <p className="text-red-700 dark:text-red-300 mt-0.5">
                                    {classResult?.reasoning || "This document failed during AI processing. Delete and try uploading again."}
                                </p>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2 items-center">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin shrink-0" />
                            <div className="text-xs">
                                <p className="font-medium text-blue-800 dark:text-blue-200">Processing Document</p>
                                <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                                    AI is analyzing this document. This usually takes a few seconds.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* AI Analysis Section */}
                    {classResult && (
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Wand2 className="h-3.5 w-3.5" />
                                AI Analysis
                            </Label>
                            <div className={cn(
                                "p-3 rounded-lg border text-sm",
                                classResult.type === "match"
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                                    : classResult.type === "suggestion"
                                        ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                                        : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className={cn(
                                        "text-[10px]",
                                        classResult.type === "match"
                                            ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800"
                                            : classResult.type === "suggestion"
                                                ? "border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/50 dark:border-purple-800"
                                                : "border-slate-300 text-slate-600 bg-slate-50 dark:bg-slate-950/50 dark:border-slate-800"
                                    )}>
                                        {classResult.type === "match" ? (
                                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Matched</>
                                        ) : classResult.type === "suggestion" ? (
                                            <><Sparkles className="h-3 w-3 mr-1" /> New Control Suggested</>
                                        ) : (
                                            "Unmatched"
                                        )}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {classResult.reasoning || evidence.summary || "No analysis available."}
                                </p>
                                {isAiMatch && classResult.matchedControlTitle && (
                                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                            Matched to: {classResult.matchedControlTitle}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* For LOCKED states (approved/pending_review) - Show summary only */}
                    {isLocked ? (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex gap-2">
                                <Eye className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                    <p className="font-medium text-slate-800 dark:text-slate-200">
                                        {evidence.status === "approved" ? "Approved" : "Under Review"}
                                    </p>
                                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                        {evidence.status === "approved"
                                            ? "This document is approved and read-only."
                                            : "This document is read-only."}
                                    </p>
                                </div>
                            </div>

                            {/* Reviewer Information */}
                            {(evidence.status === 'pending_review' ||
                                evidence.status === 'approved' ||
                                evidence.status === 'rejected') && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                            {evidence.status === 'pending_review' ? (
                                                <User className="h-3.5 w-3.5" />
                                            ) : (
                                                <UserCheck className="h-3.5 w-3.5" />
                                            )}
                                            Reviewer Information
                                        </Label>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {evidence.status === 'pending_review' ? (
                                                // Show expected reviewer role
                                                <>
                                                    <div className="p-2 rounded bg-muted/50">
                                                        <p className="text-muted-foreground">Status</p>
                                                        <p className="font-medium">Awaiting Review</p>
                                                    </div>
                                                    <div className="p-2 rounded bg-muted/50">
                                                        <p className="text-muted-foreground">Assigned To</p>
                                                        <p className="font-medium">{evidence.assigneeRole || 'Director'}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                // Show actual reviewer for approved/rejected
                                                <>
                                                    <div className="p-2 rounded bg-muted/50">
                                                        <p className="text-muted-foreground">Reviewer</p>
                                                        <p className="font-medium">
                                                            {evidence.reviewerName || 'Unknown'}
                                                        </p>
                                                    </div>
                                                    {evidence.reviewedAt && (
                                                        <div className="p-2 rounded bg-muted/50">
                                                            <p className="text-muted-foreground">Reviewed</p>
                                                            <p className="font-medium">
                                                                {format(new Date(evidence.reviewedAt), "MMM d, yyyy")}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Review Notes - Show for approved/rejected if present */}
                                        {evidence.reviewNotes && evidence.status !== 'pending_review' && (
                                            <div className="p-2 rounded bg-muted/50 text-xs">
                                                <p className="text-muted-foreground mb-1">Review Notes</p>
                                                <p className="text-foreground leading-relaxed">
                                                    {evidence.reviewNotes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* Summary Display */}
                            {evidence.summary && (
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Summary</Label>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{evidence.summary}</p>
                                </div>
                            )}
                        </div>
                    ) : !isProcessing && (
                        /* EDITABLE state (draft, rejected, failed) */
                        <div className="space-y-4">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="text-xs">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-9"
                                />
                            </div>

                            {/* Evidence Date & Category - Side by Side */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="evidenceDate" className="text-xs flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Evidence Date
                                    </Label>
                                    <Input
                                        id="evidenceDate"
                                        type="date"
                                        value={evidenceDate}
                                        onChange={(e) => setEvidenceDate(e.target.value)}
                                        className="h-9"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="category" className="text-xs">Category</Label>
                                    <Select value={categoryId || "none"} onValueChange={setCategoryId}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Select category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No category</SelectItem>
                                            {refData?.categories?.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Local Control Assignment */}
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <Link2 className="h-3.5 w-3.5" />
                                        Local Control
                                    </span>
                                    {isAiMatch && localControlId === classResult?.matchedControlId && (
                                        <Badge variant="outline" className="text-[9px] h-4 border-emerald-300 text-emerald-700 bg-emerald-50">
                                            AI Matched
                                        </Badge>
                                    )}
                                </Label>

                                {/* Suggestion Card - Only for AI suggestions (new control needed) */}
                                {showSuggestionCard && (
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-purple-200/50 dark:border-purple-800/50 mb-2">
                                        <div className="flex items-start gap-2">
                                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-xs text-purple-700 dark:text-purple-300">
                                                    No matching control found
                                                </p>
                                                <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">
                                                    AI suggests creating: <span className="font-medium">{classResult?.suggestedControlTitle}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full mt-2 h-8 text-xs bg-white/70 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30"
                                            onClick={handleCreateControl}
                                        >
                                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                                            Create Control & Assign
                                        </Button>
                                    </div>
                                )}

                                <Popover open={isControlOpen} onOpenChange={setIsControlOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={isControlOpen}
                                            className={cn(
                                                "w-full justify-between h-9 font-normal",
                                                isAiMatch && localControlId === classResult?.matchedControlId && "border-emerald-300"
                                            )}
                                        >
                                            {effectiveControl?.title || "Select control..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[320px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search controls..." />
                                            <CommandList>
                                                <CommandEmpty>No control found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="none"
                                                        onSelect={() => {
                                                            setLocalControlId("");
                                                            setIsControlOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", !localControlId ? "opacity-100" : "opacity-0")} />
                                                        No control
                                                    </CommandItem>
                                                    {controls.map((control) => (
                                                        <CommandItem
                                                            key={control.id}
                                                            value={control.title}
                                                            onSelect={() => {
                                                                setLocalControlId(control.id);
                                                                setIsControlOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", localControlId === control.id ? "opacity-100" : "opacity-0")} />
                                                            <span className="truncate">{control.title}</span>
                                                            {classResult?.matchedControlId === control.id && (
                                                                <Badge variant="outline" className="ml-auto text-[9px] h-4 border-emerald-300 text-emerald-600">
                                                                    AI Match
                                                                </Badge>
                                                            )}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>

                                {/* Reviewer Info - Based on selected control */}
                                {effectiveControl && (
                                    <div className="mt-2 p-2.5 rounded-lg bg-muted/40 border border-border/50">
                                        <div className="flex items-center gap-2 text-xs">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="text-muted-foreground">Will be sent to:</span>
                                            <span className="font-medium text-foreground">
                                                {effectiveControl.defaultReviewerRole || 'Director'}
                                            </span>
                                        </div>
                                        {effectiveControl.fallbackReviewerRole && (
                                            <div className="flex items-center gap-2 text-[11px] mt-1 ml-5 text-muted-foreground">
                                                <span>Fallback:</span>
                                                <span>{effectiveControl.fallbackReviewerRole}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="space-y-1.5">
                                <Label htmlFor="summary" className="text-xs">Summary</Label>
                                <Textarea
                                    id="summary"
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    className="min-h-[80px] text-sm"
                                    placeholder="AI-generated or custom summary..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Content Preview */}
                    {evidence.textContent && (
                        <Collapsible open={showContentPreview} onOpenChange={setShowContentPreview}>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between h-9 px-3 hover:bg-muted/50">
                                    <span className="text-xs font-medium">Content Preview</span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", showContentPreview && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-2 max-h-[300px] overflow-auto rounded-lg border bg-muted/30 p-3">
                                    {evidence.mimeType?.includes("csv") || evidence.title.endsWith(".csv") ? (
                                        <div className="rounded-md border bg-background overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {parseCsv(evidence.textContent)[0]?.map((header, i) => (
                                                            <TableHead key={i} className="text-xs whitespace-nowrap">{header}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {parseCsv(evidence.textContent).slice(1, 6).map((row, i) => (
                                                        <TableRow key={i}>
                                                            {row.map((cell, j) => (
                                                                <TableCell key={j} className="text-xs">{cell}</TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            {parseCsv(evidence.textContent).length > 6 && (
                                                <p className="text-xs text-muted-foreground text-center py-2">
                                                    +{parseCsv(evidence.textContent).length - 6} more rows
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                                            <Markdown remarkPlugins={[remarkGfm]}>
                                                {evidence.textContent.slice(0, 2000)}
                                            </Markdown>
                                            {evidence.textContent.length > 2000 && (
                                                <p className="text-muted-foreground">... (truncated)</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* File Info */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">File Information</Label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded bg-muted/50">
                                <p className="text-muted-foreground">Size</p>
                                <p className="font-medium">{formatFileSize(evidence.sizeBytes)}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                                <p className="text-muted-foreground">Type</p>
                                <p className="font-medium truncate" title={evidence.mimeType}>
                                    {evidence.mimeType.split("/")[1]?.toUpperCase() || "Unknown"}
                                </p>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                                <p className="text-muted-foreground">Uploaded</p>
                                <p className="font-medium">{format(new Date(evidence.uploadedAt), "MMM d, yyyy")}</p>
                            </div>
                            <div className="p-2 rounded bg-muted/50">
                                <p className="text-muted-foreground">Evidence Date</p>
                                <p className="font-medium">
                                    {evidence.evidenceDate ? format(new Date(evidence.evidenceDate), "MMM d, yyyy") : "Not set"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {/* Actions Footer */}
            <div className="p-3 border-t bg-muted/20 space-y-2">
                {isDraft && (
                    <Button
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
                        onClick={() => handleSave(true)}
                        disabled={updateMutation.isPending || !localControlId}
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit for Review
                    </Button>
                )}

                <div className="flex gap-1.5">
                    {!isLocked && !isProcessing && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8"
                            onClick={() => handleSave(false)}
                            disabled={updateMutation.isPending || !hasChanges}
                        >
                            {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                            Save
                        </Button>
                    )}

                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
                        <Download className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {isDraft && (
                    <button
                        className="w-full text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors py-0.5"
                        onClick={handleReject}
                        disabled={updateMutation.isPending}
                    >
                        Mark as irrelevant
                    </button>
                )}
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{evidence.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-background hover:bg-destructive/80"
                            onClick={() => deleteMutation.mutate({ data: { evidenceId: evidence.id } })}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
