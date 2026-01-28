import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
    ExternalLink,
    ChevronDown,
    Calendar,
    AlertTriangle,
    ArrowRight,
    Plus,
    Eye,
    Send,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EvidenceItem, STATUS_CONFIG, EvidenceStatus } from "./documents-view";
import { updateEvidenceFn, deleteEvidenceFn, getEvidenceReferenceDataFn } from "@/core/functions/evidence";
import { getLocalControlsFn } from "@/core/functions/local-control-functions";
import { parseCsv } from "@/utils/csv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DocumentsSidebarProps {
    evidence: EvidenceItem | null;
    onClose: () => void;
    siteId: string;
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

export function DocumentsSidebar({ evidence, onClose, siteId }: DocumentsSidebarProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Form state
    const [title, setTitle] = useState("");
    const [status, setStatus] = useState<EvidenceStatus>("draft");
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

    // Fetch reference data
    const { data: refData } = useQuery({
        queryKey: ["evidence-refs"],
        queryFn: () => getEvidenceReferenceDataFn(),
        enabled: !!evidence,
    });

    // Fetch local controls
    const { data: controlsData } = useQuery({
        queryKey: ["local-controls", siteId, qsId],
        queryFn: () => getLocalControlsFn({ data: { siteId, qsId: qsId || undefined } }),
        enabled: !!evidence && !!siteId,
    });

    const controls = controlsData?.controls || [];

    // Initialize form when evidence changes
    useEffect(() => {
        if (evidence) {
            setTitle(evidence.title || "");
            setStatus(evidence.status);
            setSummary(evidence.summary || "");
            setEvidenceDate(evidence.evidenceDate ? format(new Date(evidence.evidenceDate), "yyyy-MM-dd") : "");
            setLocalControlId(evidence.localControlId || "");
            setCategoryId(evidence.evidenceCategoryId || "");
            setQsId(evidence.qsId || "");
            setHasChanges(false);
            setShowContentPreview(false);
        }
    }, [evidence?.id]);

    // Track changes
    useEffect(() => {
        if (!evidence) return;
        const changed =
            title !== (evidence.title || "") ||
            status !== evidence.status ||
            summary !== (evidence.summary || "") ||
            evidenceDate !== (evidence.evidenceDate ? format(new Date(evidence.evidenceDate), "yyyy-MM-dd") : "") ||
            localControlId !== (evidence.localControlId || "") ||
            categoryId !== (evidence.evidenceCategoryId || "");
        setHasChanges(changed);
    }, [title, status, summary, evidenceDate, localControlId, categoryId, evidence]);

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

        // Validation for submitting
        if (submitForReview) {
            if (!localControlId || localControlId === "none") {
                toast.error("Please select a Local Control before submitting for review.");
                return;
            }
        }

        updateMutation.mutate({
            data: {
                evidenceId: evidence.id,
                updates: {
                    title,
                    status: submitForReview ? "pending_review" : status,
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

        // Navigate to checklist page with prefilled data via URL params
        const params = new URLSearchParams();
        if (evidence.classificationResult.suggestedControlTitle) {
            params.set("createControl", "true");
            params.set("title", evidence.classificationResult.suggestedControlTitle);
        }
        if (evidence.classificationResult.suggestedQsId) {
            params.set("qsId", evidence.classificationResult.suggestedQsId);
        }
        // Store the evidence ID so we can link it after creating the control
        params.set("linkEvidenceId", evidence.id);

        navigate({ to: "/checklist", search: params.toString() ? `?${params.toString()}` : undefined });
    };

    if (!evidence) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
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

    const effectiveControl = localControlId
        ? controls.find((c) => c.id === localControlId)
        : null;

    const hasSuggestion = !effectiveControl && evidence.classificationResult?.suggestedControlTitle;

    return (
        <div className="flex flex-col h-full border-l bg-card">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                        config.bgColor
                    )}>
                        <FileIcon className={cn("h-5 w-5", config.textColor)} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate" title={evidence.title}>
                            {evidence.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                config.bgColor, config.textColor, "border", config.borderColor
                            )}>
                                <config.icon className={cn("h-3 w-3", config.iconClass)} />
                                {config.label}
                            </span>
                            {evidence.aiConfidence && (
                                <span className="text-[10px] text-muted-foreground">
                                    {evidence.aiConfidence}% confidence
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {/* Draft Warning */}
                    {isDraft && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="font-medium text-amber-800 dark:text-amber-200">Action Required</p>
                                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                                    Review the AI analysis and confirm or correct the control assignment before submitting.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Failed Warning */}
                    {isFailed && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="font-medium text-red-800 dark:text-red-200">Processing Failed</p>
                                <p className="text-red-700 dark:text-red-300 mt-0.5">
                                    {evidence.classificationResult?.reasoning || "This document failed during AI processing. Delete and try uploading again."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Processing Info */}
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

                    {/* Locked Notice */}
                    {isLocked && (
                        <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex gap-2">
                            <Eye className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <p className="font-medium text-slate-800 dark:text-slate-200">
                                    {evidence.status === "approved" ? "Approved" : "Under Review"}
                                </p>
                                <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                    This document cannot be edited while {evidence.status === "approved" ? "approved" : "pending review"}.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* AI Analysis Section */}
                    {evidence.classificationResult && (
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Wand2 className="h-3.5 w-3.5" />
                                AI Analysis
                            </Label>
                            <div className={cn(
                                "p-3 rounded-lg border text-sm",
                                evidence.classificationResult.type === "match"
                                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                                    : evidence.classificationResult.type === "suggestion"
                                    ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                                    : "bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800"
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline" className={cn(
                                        "text-[10px]",
                                        evidence.classificationResult.type === "match"
                                            ? "border-emerald-200 text-emerald-700"
                                            : evidence.classificationResult.type === "suggestion"
                                            ? "border-purple-200 text-purple-700"
                                            : "border-slate-200 text-slate-600"
                                    )}>
                                        {evidence.classificationResult.type === "match"
                                            ? "Matched"
                                            : evidence.classificationResult.type === "suggestion"
                                            ? "Suggestion"
                                            : "Unmatched"}
                                    </Badge>
                                    {evidence.classificationResult.confidence && (
                                        <span className="text-[10px] text-muted-foreground">
                                            {evidence.classificationResult.confidence}% confidence
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {evidence.classificationResult.reasoning || evidence.summary || "No analysis available."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Editable Fields */}
                    <div className="space-y-4">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label htmlFor="title" className="text-xs">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={isLocked || isProcessing}
                                className="h-9"
                            />
                        </div>

                        {/* Evidence Date */}
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
                                disabled={isLocked || isProcessing}
                                className="h-9"
                            />
                        </div>

                        {/* Status (for demo purposes) */}
                        <div className="space-y-1.5">
                            <Label htmlFor="status" className="text-xs">Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as EvidenceStatus)} disabled={isProcessing}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="pending_review">Pending Review</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <Label htmlFor="category" className="text-xs">Category</Label>
                            <Select value={categoryId || "none"} onValueChange={setCategoryId} disabled={isLocked || isProcessing}>
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

                        {/* Local Control Assignment */}
                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center justify-between">
                                <span>Local Control</span>
                                {!isLocked && !isProcessing && hasSuggestion && (
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-[10px] text-purple-600"
                                        onClick={handleCreateControl}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Create suggested control
                                    </Button>
                                )}
                            </Label>

                            {/* Suggestion Card */}
                            {hasSuggestion && !localControlId && (
                                <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-purple-200/50 dark:border-purple-800/50 mb-2">
                                    <div className="flex items-start gap-2">
                                        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-xs text-purple-700 dark:text-purple-300">
                                                AI Suggestion
                                            </p>
                                            <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-0.5 truncate">
                                                {evidence.classificationResult?.suggestedControlTitle}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full mt-2 h-7 text-xs bg-white/70 dark:bg-black/20"
                                        onClick={handleCreateControl}
                                        disabled={isLocked || isProcessing}
                                    >
                                        <ArrowRight className="h-3 w-3 mr-1.5" />
                                        Create & Assign Control
                                    </Button>
                                </div>
                            )}

                            <Popover open={isControlOpen} onOpenChange={setIsControlOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={isControlOpen}
                                        className="w-full justify-between h-9 font-normal"
                                        disabled={isLocked || isProcessing}
                                    >
                                        {effectiveControl?.title || "Select control..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
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
                                                        {control.title}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Summary */}
                        <div className="space-y-1.5">
                            <Label htmlFor="summary" className="text-xs">Summary</Label>
                            <Textarea
                                id="summary"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                disabled={isLocked || isProcessing}
                                className="min-h-[80px] text-sm"
                                placeholder="AI-generated or custom summary..."
                            />
                        </div>
                    </div>

                    {/* Content Preview */}
                    {evidence.textContent && (
                        <Collapsible open={showContentPreview} onOpenChange={setShowContentPreview}>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between h-9 px-3">
                                    <span className="text-xs font-medium">Content Preview</span>
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", showContentPreview && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-2 max-h-[300px] overflow-auto rounded-lg border bg-muted/30 p-3">
                                    {evidence.mimeType?.includes("csv") || evidence.title.endsWith(".csv") ? (
                                        <div className="rounded-md border bg-background">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {parseCsv(evidence.textContent)[0]?.map((header, i) => (
                                                            <TableHead key={i} className="text-xs">{header}</TableHead>
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
            <div className="p-4 border-t bg-muted/30 space-y-2">
                {/* Primary Actions */}
                {isDraft && (
                    <div className="flex gap-2">
                        <Button
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
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
                    </div>
                )}

                {/* Save / Secondary Actions */}
                <div className="flex gap-2">
                    {!isLocked && !isProcessing && (
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSave(false)}
                            disabled={updateMutation.isPending || !hasChanges}
                        >
                            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    )}

                    <Button variant="outline" size="icon" className="shrink-0">
                        <Download className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Reject for drafts */}
                {isDraft && (
                    <Button
                        variant="ghost"
                        className="w-full text-muted-foreground hover:text-destructive"
                        onClick={handleReject}
                        disabled={updateMutation.isPending}
                    >
                        Mark as Irrelevant
                    </Button>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
