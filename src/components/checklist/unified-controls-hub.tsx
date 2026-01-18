import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { 
    Search, 
    Plus, 
    ChevronDown, 
    MoreHorizontal, 
    Pencil, 
    Trash2, 
    Upload, 
    Clock, 
    User, 
    Sparkles, 
    CheckCircle2, 
    Loader2,
    Wand2,
    FileText,
    ArrowRight,
    PackagePlus
} from "lucide-react";
import { toast } from "sonner";
import { isPast, isToday, addDays, format } from "date-fns";

import { useSite } from "@/components/site-context";
import { getChecklistDataFn } from "@/core/functions/checklist-functions";
import { 
    getLocalControlsFn, 
    getQualityStatementsFn, 
    deleteLocalControlFn,
    suggestLocalControlsFn,
    createLocalControlFn,
    updateLocalControlFn,
    seedLocalControlsFn
} from "@/core/functions/local-control-functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";
import { UploadModal } from "@/components/evidence/upload-modal";
import { EvidenceExamplesSection } from "@/components/checklist/evidence-examples-tooltip";

// --- Helper Functions ---

function formatFrequency(type: string, days?: number | null) {
    if (type !== 'recurring' || !days) return type.charAt(0).toUpperCase() + type.slice(1);

    if (days === 7) return 'Weekly';
    if (days === 30 || days === 31) return 'Monthly';
    if (days === 90 || days === 91 || days === 92) return 'Quarterly';
    if (days === 180 || days === 182 || days === 183) return 'Bi-Annually';
    if (days === 365 || days === 366) return 'Annually';
    if (days === 730 || days === 731) return 'Every 2 Years';

    if (days % 365 === 0) return `Every ${days / 365} Years`;
    if (days % 30 === 0) return `Every ${days / 30} Months`;

    return `Every ${days} Days`;
}

// --- Main Component ---

export function UnifiedControlsHub() {
    const { activeSite } = useSite();
    const queryClient = useQueryClient();
    
    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [activeStatusTab, setActiveStatusTab] = useState("all");
    const [editControl, setEditControl] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAIOpen, setIsAIOpen] = useState(false);
    
    const [activeFilters, setActiveFilters] = useState<{
        frequency: string[];
        reviewer: string[];
        keyQuestion: string[];
    }>({
        frequency: [],
        reviewer: [],
        keyQuestion: []
    });

    // Data Fetching
    const { data: checklistData, isLoading: isChecklistLoading } = useQuery({
        queryKey: ['checklist-data', activeSite?.id],
        queryFn: () => getChecklistDataFn({ data: { siteId: activeSite?.id } }),
        enabled: !!activeSite?.id
    });

    const { data: controlsData, isLoading: isControlsLoading } = useQuery({
        queryKey: ["local-controls", activeSite?.id],
        queryFn: () => getLocalControlsFn({ data: { siteId: activeSite?.id } }),
        enabled: !!activeSite?.id
    });

    const { data: qsData } = useQuery({
        queryKey: ["quality-statements"],
        queryFn: () => getQualityStatementsFn(),
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: deleteLocalControlFn,
        onSuccess: () => {
            toast.success("Control deleted");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
        }
    });

    const seedMutation = useMutation({
        mutationFn: seedLocalControlsFn,
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Imported ${res.seeded} starter controls!`);
                queryClient.invalidateQueries({ queryKey: ["local-controls"] });
                queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
            }
        }
    });

    // Computed Values
    const controls = useMemo(() => {
        if (!controlsData?.controls) return [];
        
        return controlsData.controls.map(c => {
            const hasEvidence = c.lastEvidenceAt !== null;
            
            // Calculate next due date from last evidence + frequency
            let nextDueAt: Date | null = null;
            if (hasEvidence && c.frequencyType === 'recurring' && c.frequencyDays) {
                nextDueAt = addDays(new Date(c.lastEvidenceAt!), c.frequencyDays);
            }
            
            const isOverdue = nextDueAt && isPast(nextDueAt) && !isToday(nextDueAt);
            const isDueSoon = nextDueAt && !isOverdue && nextDueAt < addDays(new Date(), 7);
            const isOnTrack = hasEvidence && !isOverdue;
            
            let status: 'overdue' | 'due-soon' | 'on-track' | 'not-started' = 'not-started';
            if (isOverdue) status = 'overdue';
            else if (isDueSoon) status = 'due-soon';
            else if (isOnTrack) status = 'on-track';

            return { ...c, computedStatus: status, computedNextDueAt: nextDueAt };
        });
    }, [controlsData?.controls]);

    const statusCounts = useMemo(() => {
        return {
            all: controls.length,
            overdue: controls.filter(c => c.computedStatus === 'overdue').length,
            'due-soon': controls.filter(c => c.computedStatus === 'due-soon').length,
            'on-track': controls.filter(c => c.computedStatus === 'on-track').length,
            'not-started': controls.filter(c => c.computedStatus === 'not-started').length,
        };
    }, [controls]);

    const filteredControls = useMemo(() => {
        return controls.filter(c => {
            // Tab Filter
            if (activeStatusTab !== 'all' && c.computedStatus !== activeStatusTab) return false;

            // Search Filter
            const matchesSearch = 
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (c.qs?.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            // Property Filters
            if (activeFilters.frequency.length > 0) {
                const freqLabel = formatFrequency(c.frequencyType, c.frequencyDays).toLowerCase();
                if (!activeFilters.frequency.some(f => freqLabel.includes(f.toLowerCase()))) return false;
            }

            if (activeFilters.reviewer.length > 0) {
                if (!activeFilters.reviewer.includes(c.defaultReviewerRole || 'Unassigned')) return false;
            }

            if (activeFilters.keyQuestion.length > 0) {
                const kq = c.qsId?.split('.')[0] || '';
                if (!activeFilters.keyQuestion.includes(kq)) return false;
            }

            return true;
        });
    }, [controls, searchQuery, activeStatusTab, activeFilters]);

    const groupedControls = useMemo(() => {
        const groups: Record<string, { qsId: string, controls: any[] }> = {};
        
        filteredControls.forEach(control => {
            const groupName = control.qs?.title || control.qsId || "General Controls";
            if (!groups[groupName]) {
                groups[groupName] = { qsId: control.qsId, controls: [] };
            }
            groups[groupName].controls.push(control);
        });

        return groups;
    }, [filteredControls]);

    const toggleFilter = (type: keyof typeof activeFilters, value: string) => {
        setActiveFilters(prev => {
            const current = prev[type];
            const updated = current.includes(value) 
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [type]: updated };
        });
    };

    const isLoading = isChecklistLoading || isControlsLoading;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading compliance hub...</p>
            </div>
        );
    }

    const { overallProgress } = checklistData || { overallProgress: 0 };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4 flex-1">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Compliance Controls Hub</h1>
                        <p className="text-muted-foreground mt-1">Manage, track, and evidence your service standards.</p>
                    </div>
                    
                    <div className="bg-card p-4 rounded-xl border shadow-sm max-w-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Overall Compliance Status</span>
                            <span className="text-sm font-bold text-primary">{overallProgress}%</span>
                        </div>
                        <Progress value={overallProgress} className="h-2" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {controls.length === 0 && (
                        <Button 
                            variant="outline"
                            onClick={() => seedMutation.mutate({ data: { siteId: activeSite?.id } })}
                            disabled={seedMutation.isPending}
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm"
                        >
                            {seedMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                            Import Starter Pack
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        onClick={() => setIsAIOpen(true)}
                        className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-sm"
                    >
                        <Sparkles className="mr-2 h-4 w-4" /> AI Suggestions
                    </Button>
                    <Button onClick={() => { setEditControl(null); setIsDialogOpen(true); }} className="shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Control
                    </Button>
                </div>
            </div>

            {/* Navigation & Filters */}
            <div className="space-y-4">
                <Tabs value={activeStatusTab} onValueChange={setActiveStatusTab} className="w-full">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="overdue" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                            🔴 Overdue ({statusCounts.overdue})
                        </TabsTrigger>
                        <TabsTrigger value="due-soon" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                            🟡 Due Soon ({statusCounts['due-soon']})
                        </TabsTrigger>
                        <TabsTrigger value="on-track" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                            ✅ On Track ({statusCounts['on-track']})
                        </TabsTrigger>
                        <TabsTrigger value="not-started" className="data-[state=active]:bg-slate-500 data-[state=active]:text-white">
                            ⚪ Not Started ({statusCounts['not-started']})
                        </TabsTrigger>
                        <TabsTrigger value="all">
                            📋 All ({statusCounts.all})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-col md:flex-row gap-3 items-center bg-card p-3 rounded-xl border shadow-sm">
                    <div className="relative w-full md:flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search controls..." 
                            className="pl-9 bg-background h-9 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <FilterDropdown 
                            label="Key Question" 
                            options={["safe", "effective", "caring", "responsive", "well_led"]} 
                            selected={activeFilters.keyQuestion}
                            onToggle={(v) => toggleFilter('keyQuestion', v)}
                        />
                        <FilterDropdown 
                            label="Frequency" 
                            options={["Weekly", "Monthly", "Quarterly", "Annually"]} 
                            selected={activeFilters.frequency}
                            onToggle={(v) => toggleFilter('frequency', v)}
                        />
                        <FilterDropdown 
                            label="Reviewer" 
                            options={["Practice Manager", "Nurse Lead", "GP Partner", "Trainee"]} 
                            selected={activeFilters.reviewer}
                            onToggle={(v) => toggleFilter('reviewer', v)}
                        />
                        
                        {(searchQuery || activeFilters.frequency.length > 0 || activeFilters.reviewer.length > 0 || activeFilters.keyQuestion.length > 0) && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    setSearchQuery("");
                                    setActiveFilters({ frequency: [], reviewer: [], keyQuestion: [] });
                                }}
                                className="text-muted-foreground hover:text-foreground text-xs h-8"
                            >
                                Reset Filters
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grouped Controls List */}
            <div className="space-y-10">
                {Object.keys(groupedControls).length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-muted-foreground/20">
                        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-muted-foreground opacity-20" />
                        </div>
                        {controls.length === 0 ? (
                            <>
                                <h3 className="text-lg font-medium text-foreground">No controls yet</h3>
                                <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                                    Get started quickly with our curated starter pack, or add controls manually.
                                </p>
                                <div className="flex items-center justify-center gap-3 mt-4">
                                    <Button 
                                        onClick={() => seedMutation.mutate({ data: { siteId: activeSite?.id } })}
                                        disabled={seedMutation.isPending}
                                        className="gap-2"
                                    >
                                        {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                                        Import Starter Pack
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        onClick={() => { setEditControl(null); setIsDialogOpen(true); }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Add Manually
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-medium text-foreground">No controls found</h3>
                                <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters or search query.</p>
                                <Button 
                                    variant="link" 
                                    className="mt-2"
                                    onClick={() => {
                                        setActiveStatusTab("all");
                                        setSearchQuery("");
                                        setActiveFilters({ frequency: [], reviewer: [], keyQuestion: [] });
                                    }}
                                >
                                    Clear all filters
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedControls).map(([groupName, { qsId, controls }]) => (
                            <div key={groupName} className="space-y-4">
                                <div className="flex items-center gap-3 px-1">
                                    <h4 className="font-bold text-foreground tracking-tight">
                                        {groupName}
                                    </h4>
                                    <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium rounded-full h-5 px-2 text-[10px]">
                                        {controls.length}
                                    </Badge>
                                    <div className="h-px bg-border flex-1" />
                                </div>

                                <div className="grid gap-3">
                                    {controls.map((control) => (
                                        <ControlHubRow 
                                            key={control.id} 
                                            control={control}
                                            siteId={activeSite?.id || ''}
                                            onEdit={() => { setEditControl(control); setIsDialogOpen(true); }}
                                            onDelete={() => deleteMutation.mutate({ data: { id: control.id } })}
                                        />
                                    ))}
                                </div>

                                <InlineAISuggestion 
                                    qsId={qsId} 
                                    siteId={activeSite?.id || ''} 
                                    onSelectSuggestion={(s) => {
                                        setEditControl({
                                            ...s,
                                            qsId,
                                            active: true,
                                            // Format evidence examples for ControlDialog
                                            evidenceExamples: JSON.stringify(s.evidenceExamples || { good: [], bad: [] })
                                        });
                                        setIsDialogOpen(true);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <ControlDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                control={editControl}
                siteId={activeSite?.id}
                onClose={() => { setIsDialogOpen(false); setEditControl(null); }}
                qsList={qsData?.qualityStatements || []}
            />

            <SuggestControlsDialog 
                open={isAIOpen}
                onOpenChange={setIsAIOpen}
                qsList={qsData?.qualityStatements || []}
                onSelectSuggestion={(s) => {
                    setEditControl({
                        ...s,
                        active: true,
                        evidenceExamples: JSON.stringify(s.evidenceExamples || { good: [], bad: [] })
                    });
                    setIsDialogOpen(true);
                }}
            />
        </div>
    );
}

// --- Sub-components ---

function ControlHubRow({ control, siteId, onEdit, onDelete }: { control: any, siteId: string, onEdit: () => void, onDelete: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const statusConfig = {
        overdue: { color: "bg-rose-500", label: "Overdue" },
        'due-soon': { color: "bg-amber-500", label: "Due Soon" },
        'on-track': { color: "bg-emerald-500", label: "On Track" },
        'not-started': { color: "bg-slate-300", label: "Not Started" }
    };

    const status = control.computedStatus as keyof typeof statusConfig;
    const config = statusConfig[status];

    const nextDueAt = control.computedNextDueAt;
    const nextDueLabel = nextDueAt 
        ? `${isPast(new Date(nextDueAt)) ? 'Was due' : 'Due'}: ${format(new Date(nextDueAt), 'MMM d')}`
        : 'No due date';

    return (
        <div className="group bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200">
            <div className="p-4 flex items-center gap-4">
                <div className={cn("w-2 h-2 rounded-full shrink-0", config.color)} title={config.label} />
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h5 
                            className="font-semibold text-foreground cursor-pointer hover:underline underline-offset-4 decoration-primary/30"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {control.title}
                        </h5>
                        {control.sourcePackId && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                                Pack
                            </Badge>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 opacity-60" />
                            {formatFrequency(control.frequencyType, control.frequencyDays)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3 opacity-60" />
                            {control.defaultReviewerRole || 'Unassigned'}
                        </span>
                        <span>
                            Last: {control.lastEvidenceAt ? format(new Date(control.lastEvidenceAt), 'MMM d') : 'Never'}
                        </span>
                        <span className={cn("font-medium", status === 'overdue' && "text-rose-600")}>
                            {nextDueLabel}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <UploadModal
                        siteId={siteId}
                        initialQsId={control.qsId}
                        initialControlId={control.id}
                        trigger={
                            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                                <Upload className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Upload</span>
                            </Button>
                        }
                    />
                    <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                                <FileText className="mr-2 h-4 w-4" /> {isExpanded ? 'Hide' : 'View'} Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={onDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Control
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isExpanded && (
                <div className="px-10 pb-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-muted/30 rounded-lg p-3 border grid md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-3">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</span>
                                <p className="mt-1 text-muted-foreground leading-relaxed">{control.description || "No description provided."}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Evidence Guidance</span>
                                <div className="mt-1 flex gap-2 items-start text-muted-foreground bg-background p-2 rounded border border-dashed">
                                    <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                    <p className="text-xs">{control.evidenceHint || "No specific evidence guidance provided."}</p>
                                </div>
                                <EvidenceExamplesSection 
                                    evidenceExamples={control.evidenceExamples}
                                    variant="minimal"
                                    className="mt-3 pt-3 border-t border-dashed"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Configuration</span>
                                <dl className="mt-1 grid grid-cols-2 gap-y-1.5 text-xs">
                                    <dt className="text-muted-foreground">Type:</dt>
                                    <dd className="font-medium">{control.frequencyType}</dd>
                                    <dt className="text-muted-foreground">Reviewer Role:</dt>
                                    <dd className="font-medium">{control.defaultReviewerRole || '-'}</dd>
                                    <dt className="text-muted-foreground">Fallback Role:</dt>
                                    <dd className="font-medium">{control.fallbackReviewerRole || '-'}</dd>
                                    <dt className="text-muted-foreground">CQC Ref:</dt>
                                    <dd className="font-medium">{control.qsId}</dd>
                                </dl>
                            </div>
                            {control.cqcMythbusterUrl && (
                                <div className="pt-2">
                                    <a href={control.cqcMythbusterUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-primary font-medium hover:underline">
                                        <ArrowRight className="h-3 w-3 mr-1" /> View CQC Mythbuster
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InlineAISuggestion({ qsId, siteId, onSelectSuggestion }: { qsId: string, siteId: string, onSelectSuggestion: (s: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    
    const suggestMutation = useMutation({
        mutationFn: suggestLocalControlsFn,
    });

    const handleSuggest = () => {
        setIsOpen(!isOpen);
        if (!isOpen && !suggestMutation.data) {
            suggestMutation.mutate({ data: { siteId, qsId } });
        }
    };

    return (
        <div className="space-y-3">
            <button 
                onClick={handleSuggest}
                className="w-full flex items-center gap-2 py-2 px-3 bg-primary/5 border border-primary/20 rounded-lg text-sm hover:bg-primary/10 transition-colors group"
            >
                <Sparkles className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-muted-foreground">
                    AI detected potential gaps in this area. <span className="text-primary font-medium hover:underline">Get 3 suggested controls</span>
                </span>
                {suggestMutation.isPending && <Loader2 className="h-3 w-3 animate-spin ml-auto text-primary" />}
            </button>

            {isOpen && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-3 animate-in slide-in-from-top-2">
                    {suggestMutation.isPending ? (
                        <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Wand2 className="h-6 w-6 animate-pulse text-primary" />
                            <p className="text-xs">Analyzing CQC standards and your current controls...</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-3">
                            {suggestMutation.data?.suggestions?.map((s: any, i: number) => (
                                <div key={i} className="bg-card border rounded-lg p-3 space-y-2 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-1">
                                        <Badge variant="outline" className="text-[8px] h-4 border-primary/20 bg-primary/5 text-primary">
                                            {s.priority}
                                        </Badge>
                                    </div>
                                    <h6 className="font-semibold text-sm pr-10 leading-tight">{s.title}</h6>
                                    <p className="text-[11px] text-muted-foreground line-clamp-2">{s.description}</p>
                                    <Button 
                                        size="sm" 
                                        onClick={() => onSelectSuggestion(s)}
                                        className="w-full h-7 text-[10px] gap-1.5"
                                    >
                                        <Plus className="w-3 h-3" /> Add Suggestion
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function FilterDropdown({ label, options, selected, onToggle }: { label: string, options: string[], selected: string[], onToggle: (v: string) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 text-xs border-dashed bg-background", selected.length > 0 && "bg-primary/5 border-primary/40 text-primary")}>
                    {label}
                    {selected.length > 0 && <span className="ml-1.5 bg-primary/20 text-primary px-1.5 rounded-sm text-[10px] font-bold">{selected.length}</span>}
                    <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map(opt => (
                    <DropdownMenuCheckboxItem 
                        key={opt} 
                        checked={selected.includes(opt)}
                        onCheckedChange={() => onToggle(opt)}
                        className="text-xs"
                    >
                        {opt}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Reuse/Refactor these from LocalControlsManager or similar
function ControlDialog({ open, onOpenChange, control, siteId, onClose, qsList }: any) {
    const queryClient = useQueryClient();
    const isEdit = !!control?.id;
    const [activeTab, setActiveTab] = useState("basic");
    
    const [formData, setFormData] = useState({
        qsId: '',
        title: '',
        description: '',
        frequencyType: 'recurring',
        frequencyDays: 30,
        evidenceHint: '',
        defaultReviewerRole: 'Practice Manager',
        fallbackReviewerRole: '',
        active: true,
        cqcMythbusterUrl: '',
        goodExamples: '',
        badExamples: ''
    });

    useMemo(() => {
        if (open) {
            if (control) {
                let good = '', bad = '';
                try {
                    if (control.evidenceExamples) {
                        const parsed = typeof control.evidenceExamples === 'string' ? JSON.parse(control.evidenceExamples) : control.evidenceExamples;
                        good = parsed.good?.join('\n') || '';
                        bad = parsed.bad?.join('\n') || '';
                    }
                } catch (e) {}

                setFormData({
                    qsId: control.qsId || (qsList[0]?.id || ''),
                    title: control.title || '',
                    description: control.description || '',
                    frequencyType: control.frequencyType || 'recurring',
                    frequencyDays: control.frequencyDays || 30,
                    evidenceHint: control.evidenceHint || '',
                    defaultReviewerRole: control.defaultReviewerRole || 'Practice Manager',
                    fallbackReviewerRole: control.fallbackReviewerRole || '',
                    active: control.active !== false,
                    cqcMythbusterUrl: control.cqcMythbusterUrl || '',
                    goodExamples: good,
                    badExamples: bad
                });
            } else {
                setFormData({
                    qsId: qsList[0]?.id || '',
                    title: '',
                    description: '',
                    frequencyType: 'recurring',
                    frequencyDays: 30,
                    evidenceHint: '',
                    defaultReviewerRole: 'Practice Manager',
                    fallbackReviewerRole: '',
                    active: true,
                    cqcMythbusterUrl: '',
                    goodExamples: '',
                    badExamples: ''
                });
            }
        }
    }, [open, control, qsList]);

    const createMutation = useMutation({
        mutationFn: createLocalControlFn,
        onSuccess: () => {
            toast.success("Control created");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
            onClose();
        },
        onError: (e) => toast.error(e.message)
    });

    const updateMutation = useMutation({
        mutationFn: updateLocalControlFn,
        onSuccess: () => {
            toast.success("Control updated");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
            onClose();
        },
        onError: (e) => toast.error(e.message)
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        if (!formData.title) return toast.error("Title is required");
        if (!formData.qsId) return toast.error("Area of Focus is required");

        const evidenceExamples = JSON.stringify({
            good: formData.goodExamples.split('\n').filter(s => s.trim()),
            bad: formData.badExamples.split('\n').filter(s => s.trim())
        });

        const payload = {
            title: formData.title,
            description: formData.description,
            frequencyType: formData.frequencyType as any,
            frequencyDays: formData.frequencyType === 'recurring' ? formData.frequencyDays : undefined,
            evidenceHint: formData.evidenceHint,
            defaultReviewerRole: formData.defaultReviewerRole,
            fallbackReviewerRole: formData.fallbackReviewerRole,
            active: formData.active,
            evidenceExamples,
            cqcMythbusterUrl: formData.cqcMythbusterUrl,
            qsId: formData.qsId
        };

        if (isEdit) {
            updateMutation.mutate({ data: { id: control.id, ...payload } });
        } else {
            createMutation.mutate({ data: { siteId, ...payload } });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Control' : 'Add New Control'}</DialogTitle>
                    <DialogDescription>Define the requirements for this compliance check.</DialogDescription>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="schedule">Schedule</TabsTrigger>
                        <TabsTrigger value="evidence">Evidence</TabsTrigger>
                    </TabsList>
                    
                    <div className="py-4 space-y-4">
                        <TabsContent value="basic" className="space-y-4 mt-0">
                            <div className="grid gap-2">
                                <Label>Title <span className="text-red-500">*</span></Label>
                                <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Hand Hygiene Audit" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional details..." className="h-20" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Area of Focus (Quality Statement) <span className="text-red-500">*</span></Label>
                                <Select value={formData.qsId} onValueChange={v => setFormData({ ...formData, qsId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Area" /></SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {qsList.map((qs: any) => (
                                            <SelectItem key={qs.id} value={qs.id}>
                                                {qs.title} <span className="text-muted-foreground text-[10px]">({qs.keyQuestionTitle})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>Active Status</Label>
                                    <p className="text-[10px] text-muted-foreground">Inactive controls won't generate tasks</p>
                                </div>
                                <Switch checked={formData.active} onCheckedChange={c => setFormData({...formData, active: c})} />
                            </div>
                        </TabsContent>

                        <TabsContent value="schedule" className="space-y-4 mt-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Type</Label>
                                    <Select value={formData.frequencyType} onValueChange={v => setFormData({ ...formData, frequencyType: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="recurring">Recurring</SelectItem>
                                            <SelectItem value="one-off">One-off</SelectItem>
                                            <SelectItem value="observation">Observation</SelectItem>
                                            <SelectItem value="feedback">Feedback</SelectItem>
                                            <SelectItem value="process">Process</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.frequencyType === 'recurring' && (
                                    <div className="grid gap-2">
                                        <Label>Frequency (Days)</Label>
                                        <Input type="number" value={formData.frequencyDays} onChange={e => setFormData({ ...formData, frequencyDays: parseInt(e.target.value) || 0 })} />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Default Reviewer</Label>
                                    <Select value={formData.defaultReviewerRole} onValueChange={v => setFormData({ ...formData, defaultReviewerRole: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Practice Manager">Practice Manager</SelectItem>
                                            <SelectItem value="Nurse Lead">Nurse Lead</SelectItem>
                                            <SelectItem value="GP Partner">GP Partner</SelectItem>
                                            <SelectItem value="Trainee">Trainee</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Fallback Reviewer</Label>
                                    <Select value={formData.fallbackReviewerRole || "none"} onValueChange={v => setFormData({ ...formData, fallbackReviewerRole: v === "none" ? "" : v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="Practice Manager">Practice Manager</SelectItem>
                                            <SelectItem value="Nurse Lead">Nurse Lead</SelectItem>
                                            <SelectItem value="GP Partner">GP Partner</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="evidence" className="space-y-4 mt-0">
                            <div className="grid gap-2">
                                <Label>Evidence Hint</Label>
                                <Textarea value={formData.evidenceHint} onChange={e => setFormData({ ...formData, evidenceHint: e.target.value })} placeholder="What should be uploaded?" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-emerald-600">Good Examples</Label>
                                    <Textarea className="min-h-[100px] text-xs" value={formData.goodExamples} onChange={e => setFormData({...formData, goodExamples: e.target.value})} placeholder="One per line..." />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-rose-600">Poor Examples</Label>
                                    <Textarea className="min-h-[100px] text-xs" value={formData.badExamples} onChange={e => setFormData({...formData, badExamples: e.target.value})} placeholder="One per line..." />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>CQC Mythbuster URL</Label>
                                <Input value={formData.cqcMythbusterUrl} onChange={e => setFormData({ ...formData, cqcMythbusterUrl: e.target.value })} placeholder="https://www.cqc.org.uk/..." />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Control</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SuggestControlsDialog({ open, onOpenChange, qsList, onSelectSuggestion }: { open: boolean, onOpenChange: (o: boolean) => void, qsList: any[], onSelectSuggestion: (s: any) => void }) {
    const { activeSite } = useSite();
    const [qsId, setQsId] = useState<string>("all_areas");

    const suggestMutation = useMutation({
        mutationFn: suggestLocalControlsFn,
    });

    const handleGenerate = () => {
        suggestMutation.mutate({ data: { siteId: activeSite?.id, qsId: qsId === "all_areas" ? undefined : qsId } });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Control Suggestions
                    </DialogTitle>
                    <DialogDescription>
                        Analyze your compliance gaps and get smart recommendations for missing controls.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-3 items-end bg-muted/40 p-4 rounded-lg border my-4">
                    <div className="space-y-2 flex-1">
                        <Label>Area of Focus</Label>
                        <Select value={qsId} onValueChange={setQsId}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="All Areas (General Analysis)" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="all_areas" className="font-medium text-primary">All Areas (General Analysis)</SelectItem>
                                <DropdownMenuSeparator />
                                {qsList.map((qs: any) => (
                                    <SelectItem key={qs.id} value={qs.id}>
                                        {qs.title} <span className="text-muted-foreground text-xs">({qs.keyQuestionTitle})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleGenerate}
                        disabled={suggestMutation.isPending}
                        className="min-w-[140px]"
                    >
                        {suggestMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {suggestMutation.isPending ? "Analyzing..." : "Generate"}
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[300px] pr-2 space-y-4">
                    {suggestMutation.isPending && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 gap-3">
                            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                            <p>Analyzing your compliance gaps...</p>
                        </div>
                    )}
                    
                    {!suggestMutation.data && !suggestMutation.isPending && (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60 py-20">
                            <Sparkles className="h-12 w-12 mb-2" />
                            <p>Select an area and click Generate to see suggestions.</p>
                        </div>
                    )}

                    {suggestMutation.data?.suggestions && (
                        <div className="grid gap-4">
                            {suggestMutation.data.suggestions.map((s: any, i: number) => (
                                <div key={i} className="bg-card border rounded-xl p-4 space-y-3 hover:border-primary/50 transition-colors group">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-lg">{s.title}</h4>
                                                <Badge className={cn(
                                                    "text-[10px] h-5",
                                                    s.priority === 'high' ? "bg-rose-500" : s.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                                                )}>
                                                    {s.priority}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{s.description}</p>
                                        </div>
                                        <Button size="sm" onClick={() => { onSelectSuggestion(s); onOpenChange(false); }}>
                                            <Plus className="mr-2 h-4 w-4" /> Add
                                        </Button>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-3 text-xs grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="font-bold text-muted-foreground block mb-1 uppercase tracking-tighter">Why this matters</span>
                                            <p>{s.reasoning}</p>
                                        </div>
                                        <div>
                                            <span className="font-bold text-muted-foreground block mb-1 uppercase tracking-tighter">AI Confidence</span>
                                            <div className="flex items-center gap-2">
                                                <Progress value={s.confidence} className="h-1.5 flex-1" />
                                                <span className="font-mono">{s.confidence}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
