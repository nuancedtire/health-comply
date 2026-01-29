import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Search,
    LayoutGrid,
    LayoutList,
    ChevronDown,
    FileText,
    FileImage,
    FileSpreadsheet,
    File,
    Loader2,
    AlertTriangle,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    Sparkles,
    Filter,
    UserCheck,
    User,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ClassificationResult } from "@/types/classification";

// Status configuration with macOS-inspired colors
export const STATUS_CONFIG = {
    processing: {
        label: "Processing",
        color: "bg-blue-500",
        textColor: "text-blue-700 dark:text-blue-300",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800",
        icon: Loader2,
        iconClass: "animate-spin",
    },
    failed: {
        label: "Failed",
        color: "bg-red-500",
        textColor: "text-red-700 dark:text-red-300",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
        icon: AlertTriangle,
        iconClass: "",
    },
    draft: {
        label: "Draft",
        color: "bg-amber-500",
        textColor: "text-amber-700 dark:text-amber-300",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: Clock,
        iconClass: "",
    },
    pending_review: {
        label: "Pending Review",
        color: "bg-purple-500",
        textColor: "text-purple-700 dark:text-purple-300",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        borderColor: "border-purple-200 dark:border-purple-800",
        icon: Eye,
        iconClass: "",
    },
    approved: {
        label: "Approved",
        color: "bg-emerald-500",
        textColor: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        icon: CheckCircle2,
        iconClass: "",
    },
    rejected: {
        label: "Rejected",
        color: "bg-rose-500",
        textColor: "text-rose-700 dark:text-rose-300",
        bgColor: "bg-rose-50 dark:bg-rose-950/30",
        borderColor: "border-rose-200 dark:border-rose-800",
        icon: XCircle,
        iconClass: "",
    },
    archived: {
        label: "Archived",
        color: "bg-slate-500",
        textColor: "text-slate-700 dark:text-slate-300",
        bgColor: "bg-slate-50 dark:bg-slate-950/30",
        borderColor: "border-slate-200 dark:border-slate-800",
        icon: File,
        iconClass: "",
    },
} as const;

export type EvidenceStatus = keyof typeof STATUS_CONFIG;

export interface EvidenceItem {
    id: string;
    siteId: string;
    title: string;
    qsId: string;
    evidenceCategoryId: string | null;
    status: EvidenceStatus;
    uploadedAt: Date;
    evidenceDate?: Date | null;
    sizeBytes: number;
    mimeType: string;
    summary?: string | null;
    aiConfidence?: number | null;
    localControlId?: string | null;
    classificationResult?: ClassificationResult | null;
    textContent?: string | null;
    localControl?: {
        id: string;
        title: string;
    } | null;
    qs?: {
        title: string;
        keyQuestion?: {
            title: string;
        } | null;
    } | null;
    reviewerName?: string | null;
    assigneeRole?: string | null;
    reviewedAt?: Date | null;
    reviewNotes?: string | null;
}

interface DocumentsViewProps {
    evidence: EvidenceItem[];
    selectedId: string | null;
    onSelect: (item: EvidenceItem) => void;
    isLoading?: boolean;
}

type ViewMode = "list" | "icon";

// Section order for grouping
const SECTION_ORDER: EvidenceStatus[] = [
    "failed",
    "draft",
    "processing",
    "pending_review",
    "approved",
    "rejected",
    "archived",
];

// Section labels and descriptions
const SECTION_INFO: Record<EvidenceStatus, { title: string; description: string }> = {
    failed: { title: "Failed Uploads", description: "These documents failed during processing. Delete and retry." },
    draft: { title: "Needs Your Attention", description: "Review AI analysis and confirm or correct the match." },
    processing: { title: "Processing", description: "AI is analyzing these documents." },
    pending_review: { title: "Pending Review", description: "Waiting for approval from the appropriate reviewer." },
    approved: { title: "Approved", description: "These documents have been approved and are part of your evidence library." },
    rejected: { title: "Rejected", description: "These documents were rejected and may need re-uploading or reassignment." },
    archived: { title: "Archived", description: "Historical evidence that has been archived." },
};

function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.includes("csv") || mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("word")) return FileText;
    return File;
}

function StatusTag({ status }: { status: EvidenceStatus }) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            config.bgColor,
            config.textColor,
            "border",
            config.borderColor
        )}>
            <Icon className={cn("h-3 w-3", config.iconClass)} />
            {config.label}
        </span>
    );
}

function ConfidenceBadge({ confidence, type }: { confidence?: number | null; type?: ClassificationResult["type"] }) {
    if (!confidence) return null;

    const color = type === "match"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        : type === "suggestion"
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

    return (
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", color)}>
            {confidence}%
        </span>
    );
}

function DocumentListItem({
    item,
    isSelected,
    onSelect
}: {
    item: EvidenceItem;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const FileIcon = getFileIcon(item.mimeType);
    const isProcessing = item.status === "processing";

    return (
        <div
            onClick={() => !isProcessing && onSelect()}
            className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all",
                isProcessing
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-accent/50",
                isSelected
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "border-transparent hover:border-border"
            )}
        >
            <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors",
                isSelected ? "bg-primary/10" : "bg-muted/60 group-hover:bg-muted"
            )}>
                <FileIcon className={cn(
                    "h-5 w-5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                )} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    <ConfidenceBadge
                        confidence={item.aiConfidence || item.classificationResult?.confidence}
                        type={item.classificationResult?.type}
                    />
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {item.localControl ? (
                        <span className="truncate">{item.localControl.title}</span>
                    ) : item.classificationResult?.suggestedControlTitle ? (
                        <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <Sparkles className="h-3 w-3" />
                            <span className="truncate">{item.classificationResult.suggestedControlTitle}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground/70">No control assigned</span>
                    )}
                    <span className="text-border">·</span>
                    <span>{formatDistanceToNow(new Date(item.uploadedAt), { addSuffix: true })}</span>

                    {/* Reviewer Info */}
                    {(item.status === 'pending_review' || item.status === 'approved' || item.status === 'rejected') && (
                        <>
                            <span className="text-border">·</span>
                            <span className="flex items-center gap-1 text-muted-foreground/80">
                                {item.status === 'pending_review' ? (
                                    <>
                                        <User className="h-3 w-3" />
                                        <span>Reviewer: {item.assigneeRole}</span>
                                    </>
                                ) : item.reviewerName ? (
                                    <>
                                        <UserCheck className="h-3 w-3" />
                                        <span>Reviewed by {item.reviewerName}</span>
                                        {item.reviewedAt && (
                                            <>
                                                <span className="text-border">·</span>
                                                <span className="text-xs">{format(new Date(item.reviewedAt), "MMM d")}</span>
                                            </>
                                        )}
                                    </>
                                ) : null}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <StatusTag status={item.status} />
        </div>
    );
}

function DocumentIconItem({
    item,
    isSelected,
    onSelect
}: {
    item: EvidenceItem;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const FileIcon = getFileIcon(item.mimeType);
    const isProcessing = item.status === "processing";
    const config = STATUS_CONFIG[item.status];

    return (
        <div
            onClick={() => !isProcessing && onSelect()}
            className={cn(
                "group flex flex-col items-center p-3 rounded-xl border transition-all text-center",
                isProcessing
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-accent/50",
                isSelected
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "border-transparent hover:border-border"
            )}
        >
            <div className={cn(
                "relative flex items-center justify-center w-14 h-14 rounded-xl mb-2 transition-colors",
                isSelected ? "bg-primary/10" : "bg-muted/60 group-hover:bg-muted"
            )}>
                <FileIcon className={cn(
                    "h-7 w-7",
                    isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center",
                    config.color
                )}>
                    <config.icon className={cn("h-2.5 w-2.5 text-white", config.iconClass)} />
                </div>
            </div>

            <span className="font-medium text-xs truncate w-full max-w-[100px]" title={item.title}>
                {item.title}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
                {format(new Date(item.uploadedAt), "MMM d")}
            </span>
        </div>
    );
}

function DocumentSection({
    status,
    items,
    viewMode,
    selectedId,
    onSelect,
    defaultOpen = true,
}: {
    status: EvidenceStatus;
    items: EvidenceItem[];
    viewMode: ViewMode;
    selectedId: string | null;
    onSelect: (item: EvidenceItem) => void;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const config = STATUS_CONFIG[status];
    const info = SECTION_INFO[status];

    if (items.length === 0) return null;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/section">
            <CollapsibleTrigger asChild>
                <button className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    "hover:bg-accent/50 border border-transparent",
                    isOpen && config.bgColor
                )}>
                    <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        config.color
                    )} />
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{info.title}</h3>
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                                {items.length}
                            </Badge>
                        </div>
                        {isOpen && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {info.description}
                            </p>
                        )}
                    </div>
                    <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground/60 transition-transform duration-200",
                        !isOpen && "-rotate-90"
                    )} />
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                <div className={cn(
                    "mt-2 pb-2",
                    viewMode === "list" ? "space-y-1" : "grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2"
                )}>
                    {items.map((item) => (
                        viewMode === "list" ? (
                            <DocumentListItem
                                key={item.id}
                                item={item}
                                isSelected={selectedId === item.id}
                                onSelect={() => onSelect(item)}
                            />
                        ) : (
                            <DocumentIconItem
                                key={item.id}
                                item={item}
                                isSelected={selectedId === item.id}
                                onSelect={() => onSelect(item)}
                            />
                        )
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export function DocumentsView({ evidence, selectedId, onSelect, isLoading }: DocumentsViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<EvidenceStatus[]>([]);

    // Filter and group evidence
    const filteredAndGrouped = useMemo(() => {
        let filtered = evidence;

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(query) ||
                item.localControl?.title.toLowerCase().includes(query) ||
                item.summary?.toLowerCase().includes(query)
            );
        }

        // Apply status filter
        if (statusFilter.length > 0) {
            filtered = filtered.filter(item => statusFilter.includes(item.status));
        }

        // Group by status
        const grouped: Record<EvidenceStatus, EvidenceItem[]> = {
            processing: [],
            failed: [],
            draft: [],
            pending_review: [],
            approved: [],
            rejected: [],
            archived: [],
        };

        filtered.forEach(item => {
            if (grouped[item.status]) {
                grouped[item.status].push(item);
            }
        });

        return grouped;
    }, [evidence, searchQuery, statusFilter]);

    const toggleStatusFilter = (status: EvidenceStatus) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const totalFiltered = Object.values(filteredAndGrouped).flat().length;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Loading documents...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border-b bg-card/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        className="pl-9 h-9 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-9 gap-2",
                                    statusFilter.length > 0 && "border-primary/40 bg-primary/5"
                                )}
                            >
                                <Filter className="h-4 w-4" />
                                Filter
                                {statusFilter.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                                        {statusFilter.length}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Filter by Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {SECTION_ORDER.map(status => {
                                const config = STATUS_CONFIG[status];
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={status}
                                        checked={statusFilter.includes(status)}
                                        onCheckedChange={() => toggleStatusFilter(status)}
                                        className="text-xs"
                                    >
                                        <span className={cn("w-2 h-2 rounded-full mr-2", config.color)} />
                                        {config.label}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                            {statusFilter.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setStatusFilter([])}
                                        className="text-xs text-muted-foreground"
                                    >
                                        Clear filters
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center rounded-lg border bg-background p-0.5">
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setViewMode("list")}
                        >
                            <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "icon" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setViewMode("icon")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Document List */}
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                    {totalFiltered === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-30" />
                            <h3 className="font-medium text-foreground">No documents found</h3>
                            <p className="text-sm mt-1">
                                {searchQuery || statusFilter.length > 0
                                    ? "Try adjusting your search or filters"
                                    : "Upload documents to get started"}
                            </p>
                        </div>
                    ) : (
                        SECTION_ORDER.map(status => (
                            <DocumentSection
                                key={status}
                                status={status}
                                items={filteredAndGrouped[status]}
                                viewMode={viewMode}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                defaultOpen={status === "failed" || status === "draft" || status === "processing"}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
