import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLocalControlsFn, seedLocalControlsFn, createLocalControlFn, updateLocalControlFn, deleteLocalControlFn, suggestLocalControlsFn, getQualityStatementsFn } from "@/core/functions/local-control-functions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
    Loader2, 
    Wand2, 
    PlayCircle, 
    Plus, 
    MoreHorizontal, 
    Pencil, 
    Trash2, 
    ChevronDown,
    Search,
    Shield,
    Clock,
    User,
    Sparkles,
    FileText,
    Filter,
    AlertCircle,
    ArrowRight,
    List
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import { useSite } from "@/components/site-context";
import { cn } from "@/lib/utils";
import { isPast, isToday, format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";



export function LocalControlsManager() {
    const { activeSite } = useSite();
    const queryClient = useQueryClient();
    const [editControl, setEditControl] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilters, setActiveFilters] = useState<{
        frequency: string[];
        reviewer: string[];
        status: string[];
        source: string[];
        keyQuestion: string[];
    }>({
        frequency: [],
        reviewer: [],
        status: [],
        source: [],
        keyQuestion: []
    });

    const { data: controlsData, isLoading: isControlsLoading } = useQuery({
        queryKey: ["local-controls", activeSite?.id],
        queryFn: () => getLocalControlsFn({ data: { siteId: activeSite?.id } }),
        enabled: !!activeSite?.id
    });

    // Added: Fetch Quality Statements for dropdowns
    const { data: qsData } = useQuery({
        queryKey: ["quality-statements"],
        queryFn: () => getQualityStatementsFn(),
    });

    const seedMutation = useMutation({
        mutationFn: seedLocalControlsFn,
        onSuccess: (res) => {
            if (res.success) {
                toast.success(`Successfully seeded ${res.seeded} controls!`);
                queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            }
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteLocalControlFn,
        onSuccess: () => {
            toast.success("Control deleted");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
        }
    });

    const filteredControls = useMemo(() => {
        if (!controlsData?.controls) return [];
        
        return controlsData.controls.filter(c => {
            const matchesSearch = 
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (c.qs?.title || c.qsId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!matchesSearch) return false;

            if (activeFilters.frequency.length > 0) {
                const freqLabel = formatFrequency(c.frequencyType, c.frequencyDays).toLowerCase();
                const matchesFreq = activeFilters.frequency.some(f => freqLabel.includes(f.toLowerCase()));
                if (!matchesFreq) return false;
            }

            if (activeFilters.reviewer.length > 0) {
                const matchesReviewer = activeFilters.reviewer.includes(c.defaultReviewerRole || 'Unassigned');
                if (!matchesReviewer) return false;
            }

            if (activeFilters.source.length > 0) {
                const isImported = !!c.sourcePackId;
                if (activeFilters.source.includes("Imported") && !isImported) return false;
                if (activeFilters.source.includes("Manual") && isImported) return false;
            }

            if (activeFilters.status.length > 0) {
                const isOverdue = c.nextDueAt && isPast(new Date(c.nextDueAt)) && !isToday(new Date(c.nextDueAt));
                
                if (activeFilters.status.includes("Overdue") && !isOverdue) return false;
            }

            if (activeFilters.keyQuestion.length > 0) {
                const kq = c.qsId?.split('.')[0] || '';
                if (!activeFilters.keyQuestion.includes(kq)) return false;
            }

            return true;
        });
    }, [controlsData?.controls, searchQuery, activeFilters]);

    const groupedControls = useMemo(() => {
        const groups: Record<string, typeof filteredControls> = {};
        
        filteredControls.forEach(control => {
            const groupName = control.qs?.title || control.qsId || "General Controls";
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(control);
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

    if (isControlsLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
    }

    if (!controlsData?.controls.length && !searchQuery) {
        return <EmptyState onSeed={() => seedMutation.mutate({ data: { siteId: activeSite?.id } })} isSeeding={seedMutation.isPending} />;
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Controls Manager</h1>
                        <p className="text-muted-foreground mt-2 max-w-2xl">
                            Manage your local compliance framework. Import standard controls from our library or create custom checks for your service.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <SuggestControlsDialog qsList={qsData?.qualityStatements || []} />
                        <Button onClick={() => { setEditControl(null); setIsDialogOpen(true); }} className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Control
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search controls..." 
                            className="pl-9 bg-background border-muted"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 w-full overflow-x-auto pb-2 md:pb-0">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                            
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
                             <FilterDropdown 
                                label="Source" 
                                options={["Manual", "Imported"]} 
                                selected={activeFilters.source}
                                onToggle={(v) => toggleFilter('source', v)}
                            />
                            
                            {(activeFilters.frequency.length > 0 || activeFilters.reviewer.length > 0 || activeFilters.source.length > 0 || activeFilters.keyQuestion.length > 0) && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setActiveFilters({ frequency: [], reviewer: [], status: [], source: [], keyQuestion: [] })}
                                    className="text-muted-foreground hover:text-foreground text-xs h-7"
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
                {Object.keys(groupedControls).length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground bg-card/50 rounded-xl border border-dashed">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-10" />
                        <p className="text-lg font-medium">No controls found matching your filters.</p>
                        <Button variant="link" onClick={() => { setSearchQuery(""); setActiveFilters({ frequency: [], reviewer: [], status: [], source: [], keyQuestion: [] }) }}>
                            Clear all filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {Object.entries(groupedControls).map(([groupName, controls]) => (
                            <div key={groupName} className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                                        {groupName}
                                    </h4>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {controls.length}
                                    </span>
                                </div>
                                <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
                                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 p-3 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                                        <div className="pl-2">CONTROL</div>
                                        <div className="w-24 md:w-32 hidden sm:block">FREQUENCY</div>
                                        <div className="w-32 hidden md:block">REVIEWER</div>
                                        <div className="w-24 hidden lg:block">STATUS</div>
                                        <div className="w-10"></div>
                                    </div>
                                    {controls.map((control) => (
                                        <ControlRow 
                                            key={control.id} 
                                            control={control} 
                                            onEdit={() => { setEditControl(control); setIsDialogOpen(true); }}
                                            onDelete={() => deleteMutation.mutate({ data: { id: control.id } })}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ControlDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                control={editControl}
                siteId={activeSite?.id}
                onClose={() => { setIsDialogOpen(false); setEditControl(null); }}
                qsList={qsData?.qualityStatements || []}
            />
        </div>
    );
}

function FilterDropdown({ label, options, selected, onToggle }: { label: string, options: string[], selected: string[], onToggle: (v: string) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-7 text-xs border-dashed", selected.length > 0 && "bg-primary/5 border-primary/40 text-primary")}>
                    {label}
                    {selected.length > 0 && <span className="ml-1.5 bg-primary/20 text-primary px-1 rounded-sm text-[10px]">{selected.length}</span>}
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

function ControlRow({ control, onEdit, onDelete }: { control: any, onEdit: () => void, onDelete: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const isOverdue = control.nextDueAt && isPast(new Date(control.nextDueAt));
    const statusColor = isOverdue ? "bg-red-500" : control.active ? "bg-emerald-500" : "bg-slate-300";

    return (
        <div className="group border-b last:border-0 hover:bg-muted/20 transition-colors">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 p-3 items-center">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", statusColor)} />
                    <div className="min-w-0">
                        <div 
                            className="font-medium text-sm text-foreground truncate cursor-pointer hover:underline decoration-dashed underline-offset-4"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {control.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                             {control.sourcePackId && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground border-muted-foreground/30 font-normal">
                                    Pack
                                </Badge>
                             )}
                            <p className="text-xs text-muted-foreground truncate hidden sm:block max-w-[300px]">
                                {control.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="hidden sm:flex items-center text-xs text-muted-foreground w-24 md:w-32">
                    <Clock className="mr-1.5 h-3 w-3 opacity-70" />
                    {formatFrequency(control.frequencyType, control.frequencyDays)}
                </div>

                <div className="hidden md:flex items-center text-xs text-muted-foreground w-32">
                    <User className="mr-1.5 h-3 w-3 opacity-70" />
                    <span className="truncate">{control.defaultReviewerRole || 'Unassigned'}</span>
                </div>

                 <div className="hidden lg:flex items-center text-xs w-24">
                     {control.nextDueAt ? (
                         <span className={cn("truncate font-medium", isOverdue ? "text-red-600" : "text-muted-foreground")}>
                             {format(new Date(control.nextDueAt), 'MMM d, yyyy')}
                         </span>
                     ) : (
                         <span className="text-muted-foreground/50">-</span>
                     )}
                </div>

                <div className="flex justify-end w-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                                <List className="mr-2 h-4 w-4" /> {isExpanded ? 'Hide Details' : 'Show Details'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isExpanded && (
                <div className="bg-muted/30 px-4 py-3 border-t text-sm grid gap-4 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evidence Guidance</span>
                            <div className="mt-1 p-2 bg-background rounded border text-muted-foreground text-xs flex gap-2 items-start">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                                {control.evidenceHint || "No specific evidence guidance provided."}
                            </div>
                        </div>
                        {control.evidenceExamples && (
                             <div>
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Examples</span>
                                <div className="mt-1 grid grid-cols-2 gap-2">
                                     {(() => {
                                         try {
                                             const examples = JSON.parse(control.evidenceExamples);
                                              return (
                                                 <>
                                                    <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded text-xs">
                                                        <div className="font-medium text-emerald-700 dark:text-emerald-400 mb-1">Good Evidence</div>
                                                        <ul className="list-disc list-inside text-emerald-900/70 dark:text-emerald-200/70 space-y-0.5">
                                                            {examples.good?.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div className="p-2 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded text-xs">
                                                        <div className="font-medium text-red-700 dark:text-red-400 mb-1">Poor Evidence</div>
                                                        <ul className="list-disc list-inside text-red-900/70 dark:text-red-200/70 space-y-0.5">
                                                            {examples.bad?.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                                        </ul>
                                                    </div>
                                                 </>
                                             )
                                         } catch (e) { return <p className="text-xs text-muted-foreground">Invalid examples format</p> }
                                     })()}
                                </div>
                             </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</span>
                            <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                <dt className="text-muted-foreground">Type:</dt>
                                <dd className="font-medium capitalize">{control.frequencyType}</dd>
                                <dt className="text-muted-foreground">Default Reviewer:</dt>
                                <dd className="font-medium">{control.defaultReviewerRole || '-'}</dd>
                                <dt className="text-muted-foreground">Fallback Reviewer:</dt>
                                <dd className="font-medium">{control.fallbackReviewerRole || '-'}</dd>
                                <dt className="text-muted-foreground">CQC Ref:</dt>
                                <dd className="font-medium truncate">{control.qsId}</dd>
                            </dl>
                        </div>
                        {control.cqcMythbusterUrl && (
                             <div className="pt-2">
                                 <a 
                                    href={control.cqcMythbusterUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="inline-flex items-center text-xs text-primary hover:underline"
                                 >
                                     <ArrowRight className="h-3 w-3 mr-1" /> View CQC Mythbuster
                                 </a>
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ControlDialog({ open, onOpenChange, control, siteId, onClose, qsList }: any) {
    const queryClient = useQueryClient();
    const isEdit = !!control;
    const [activeTab, setActiveTab] = useState("basic");
    
    const [formData, setFormData] = useState({
        qsId: '',
        title: '',
        description: '',
        frequencyType: 'recurring',
        frequencyDays: 30,
        evidenceHint: '',
        defaultReviewerRole: 'Practice Manager',
        fallbackReviewerRole: 'Nurse Lead',
        active: true,
        cqcMythbusterUrl: '',
        goodExamples: '',
        badExamples: ''
    });

    useEffect(() => {
        if (open && control) {
            let good = '', bad = '';
            try {
                if (control.evidenceExamples) {
                    const parsed = JSON.parse(control.evidenceExamples);
                    good = parsed.good?.join('\n') || '';
                    bad = parsed.bad?.join('\n') || '';
                }
            } catch (e) {}

            setFormData({
                qsId: control.qsId,
                title: control.title,
                description: control.description || '',
                frequencyType: control.frequencyType,
                frequencyDays: control.frequencyDays || 30,
                evidenceHint: control.evidenceHint || '',
                defaultReviewerRole: control.defaultReviewerRole || 'Practice Manager',
                fallbackReviewerRole: control.fallbackReviewerRole || '',
                active: control.active,
                cqcMythbusterUrl: control.cqcMythbusterUrl || '',
                goodExamples: good,
                badExamples: bad
            });
        } else if (open && !control) {
            setFormData({
                qsId: qsList[0]?.id || 'safe.infection_control', // Default to first if available
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
    }, [open, control, qsList]);

    const createMutation = useMutation({
        mutationFn: createLocalControlFn,
        onSuccess: () => {
            toast.success("Control created");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            onClose();
        },
        onError: (e) => toast.error(e.message)
    });

    const updateMutation = useMutation({
        mutationFn: updateLocalControlFn,
        onSuccess: () => {
            toast.success("Control updated");
            queryClient.invalidateQueries({ queryKey: ["local-controls"] });
            onClose();
        },
        onError: (e) => toast.error(e.message)
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = () => {
        if (!formData.title) return toast.error("Title is required");

        const evidenceExamples = JSON.stringify({
            good: formData.goodExamples.split('\n').filter(s => s.trim()),
            bad: formData.badExamples.split('\n').filter(s => s.trim())
        });

        const commonData = {
            title: formData.title,
            description: formData.description,
            frequencyType: formData.frequencyType as any,
            frequencyDays: formData.frequencyType === 'recurring' ? formData.frequencyDays : undefined,
            evidenceHint: formData.evidenceHint,
            defaultReviewerRole: formData.defaultReviewerRole,
            fallbackReviewerRole: formData.fallbackReviewerRole,
            active: formData.active,
            evidenceExamples,
            cqcMythbusterUrl: formData.cqcMythbusterUrl
        };

        if (isEdit) {
            updateMutation.mutate({
                data: {
                    id: control.id,
                    ...commonData
                }
            });
        } else {
            createMutation.mutate({
                data: {
                    qsId: formData.qsId,
                    siteId,
                    ...commonData
                }
            });
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
                        <TabsTrigger value="schedule">Schedule & Role</TabsTrigger>
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

                            {!isEdit && (
                                <div className="grid gap-2">
                                    <Label>Area of Focus (Quality Statement)</Label>
                                    <Select value={formData.qsId} onValueChange={v => setFormData({ ...formData, qsId: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select Area" /></SelectTrigger>
                                        <SelectContent className="max-h-[200px]">
                                            {qsList.map((qs: any) => (
                                                <SelectItem key={qs.id} value={qs.id}>
                                                    {qs.title} <span className="text-muted-foreground text-xs">({qs.keyQuestionTitle})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                             {isEdit && (
                                <div className="flex items-center justify-between border p-3 rounded-lg">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Active Status</Label>
                                        <p className="text-xs text-muted-foreground">Inactive controls won't generate tasks</p>
                                    </div>
                                    <Switch checked={formData.active} onCheckedChange={c => setFormData({...formData, active: c})} />
                                </div>
                            )}
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
                                    <Label className="text-emerald-600">Good Examples (one per line)</Label>
                                    <Textarea className="min-h-[100px]" value={formData.goodExamples} onChange={e => setFormData({...formData, goodExamples: e.target.value})} placeholder="- Signed audit log&#10;- Photo of stock" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-red-600">Poor Examples (one per line)</Label>
                                    <Textarea className="min-h-[100px]" value={formData.badExamples} onChange={e => setFormData({...formData, badExamples: e.target.value})} placeholder="- Unsigned paper&#10;- Old email" />
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
    )
}

function SuggestControlsDialog({ qsList }: { qsList: any[] }) {
    const { activeSite } = useSite();
    const [qsId, setQsId] = useState<string>("all_areas"); // Default to "all_areas" which means general search
    const [isOpen, setIsOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
    const [editingSuggestion, setEditingSuggestion] = useState<any>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const suggestMutation = useMutation({
        mutationFn: suggestLocalControlsFn,
    });

    const suggestions = useMemo(() => {
        if (!suggestMutation.data) return null;

        return {
            isMock: false,
            items: suggestMutation.data.suggestions || []
        };
    }, [suggestMutation.data]);

    const toggleExpand = (index: number) => {
        setExpandedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'high': return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900";
            case 'medium': return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900";
            case 'low': return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900";
            default: return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
        }
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 80) return "bg-emerald-500";
        if (score >= 50) return "bg-amber-500";
        return "bg-slate-400";
    };

    const handleEditSuggestion = (s: any) => {
        // Fix: Pass the entire evidenceExamples object as a JSON string,
        // because the ControlDialog expects to parse it itself.
        const evidenceExamples = JSON.stringify(s.evidenceExamples || { good: [], bad: [] });
        
        setEditingSuggestion({
            qsId: qsId === "all_areas" ? "safe.infection_control" : qsId, // Default fallback if generic
            title: s.title,
            description: s.description || '',
            frequencyType: s.frequencyType || 'recurring',
            frequencyDays: s.frequencyDays || 30,
            evidenceHint: s.evidenceHint || '',
            defaultReviewerRole: s.defaultReviewerRole || 'Practice Manager',
            fallbackReviewerRole: s.fallbackReviewerRole || '',
            active: true,
            cqcMythbusterUrl: '',
            evidenceExamples // Pass the JSON string here
        });
        setIsEditDialogOpen(true);
    };

    const handleGenerate = () => {
        const payload: any = { siteId: activeSite?.id };
        if (qsId && qsId !== "all_areas") {
            payload.qsId = qsId;
        }
        suggestMutation.mutate({ data: payload });
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) setExpandedItems({}); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-sm">
                    <Sparkles className="mr-2 h-4 w-4" /> AI Suggestions
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Control Suggestions
                    </DialogTitle>
                    <DialogDescription>
                        Let AI analyze your compliance gaps and suggest relevant missing controls.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex gap-3 items-end bg-muted/40 p-4 rounded-lg border">
                        <div className="space-y-2 flex-1">
                            <Label>Area of Focus (Optional)</Label>
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
                            {suggestMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-4 w-4" /> Generate
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[300px] pr-2 space-y-4">
                        {suggestMutation.isPending && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p>Analyzing your compliance gaps...</p>
                            </div>
                        )}
                        
                        {!suggestions && !suggestMutation.isPending && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                                <Sparkles className="h-12 w-12 mb-2" />
                                <p>Select an area (or leave as 'All Areas') and click Generate</p>
                            </div>
                        )}

                        {suggestions && (
                            <>
                                {suggestions.isMock && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs rounded-md border border-amber-200 dark:border-amber-900 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>AI service unavailable in development. Showing example suggestions instead.</span>
                                    </div>
                                )}
                                
                                {suggestions.items.length > 0 ? (
                                    <div className="grid gap-3">
                                        {suggestions.items.map((s: any, i: number) => (
                                            <Card key={i} className="overflow-hidden border-muted hover:border-primary/50 transition-colors">
                                                <div className="p-4 flex flex-col gap-3">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="space-y-1.5 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="font-semibold text-foreground">{s.title}</h4>
                                                                {s.priority && (
                                                                    <Badge variant="outline" className={cn("text-[10px] h-5 border-0", getPriorityColor(s.priority))}>
                                                                        {s.priority} Priority
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">{s.description}</p>
                                                        </div>
                                                        <Button size="sm" onClick={() => handleEditSuggestion(s)} className="shrink-0 h-8">
                                                            <Plus className="mr-2 h-3.5 w-3.5" /> Add
                                                        </Button>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <button 
                                                            onClick={() => toggleExpand(i)}
                                                            className="text-xs flex items-center gap-1 text-primary hover:underline font-medium"
                                                        >
                                                            {expandedItems[i] ? "Hide Details" : "View Details"}
                                                            <ChevronDown className={cn("h-3 w-3 transition-transform", expandedItems[i] && "rotate-180")} />
                                                        </button>
                                                        {s.confidence && (
                                                            <div className="flex items-center gap-1.5 ml-auto" title="AI Confidence Score">
                                                                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={cn("h-full rounded-full", getConfidenceColor(s.confidence))} 
                                                                        style={{ width: `${s.confidence}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground font-mono">{s.confidence}%</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {expandedItems[i] && (
                                                        <div className="mt-2 p-3 bg-muted/50 rounded-md text-xs space-y-2 animate-in slide-in-from-top-1">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <span className="font-semibold text-muted-foreground">Type:</span> {s.frequencyType}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold text-muted-foreground">Reviewer:</span> {s.defaultReviewerRole}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-muted-foreground block mb-1">Reasoning:</span>
                                                                <p className="text-muted-foreground/80">{s.reasoning}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <p>No new suggestions found for this area.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        <ControlDialog 
            open={isEditDialogOpen} 
            onOpenChange={setIsEditDialogOpen}
            control={editingSuggestion}
            siteId={activeSite?.id}
            onClose={() => { setIsEditDialogOpen(false); setEditingSuggestion(null); }}
            qsList={qsList}
        />
        </>
    );
}

function EmptyState({ onSeed, isSeeding }: { onSeed: () => void, isSeeding: boolean }) {
    return (
        <Card className="border-dashed border-2 bg-muted/5 max-w-2xl mx-auto mt-8">
            <CardHeader className="text-center pb-8 pt-10">
                <div className="mx-auto bg-primary/10 p-5 rounded-full w-fit mb-5 ring-1 ring-primary/20">
                    <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">Start Your Compliance Journey</CardTitle>
                <CardDescription className="max-w-md mx-auto mt-3 text-base">
                    You don't have any controls set up yet. Create them manually or use our AI-powered Standard Pack to get up and running instantly.
                </CardDescription>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <Button size="lg" onClick={onSeed} disabled={isSeeding} className="shadow-md transition-all hover:scale-105">
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        Apply Standard Pack
                    </Button>
                </div>
            </CardHeader>
        </Card>
    );
}

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
