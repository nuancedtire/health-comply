import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
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
  PackagePlus,
  Shield,
  CheckCircle,
  Heart,
  Zap,
  Users,
  AlertTriangle,
  Calendar,
  XCircle,
  AlertCircle,
  CircleDot,
  List,
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
  seedLocalControlsFn,
  generateControlDetailsFn,
} from "@/core/functions/local-control-functions";
import { updateEvidenceFn } from "@/core/functions/evidence";

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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";
import { UploadModal } from "@/components/evidence/upload-modal";
import { EvidenceExamplesSection } from "@/components/checklist/evidence-examples-tooltip";

// --- Helper Functions ---

function formatFrequency(type: string, days?: number | null) {
  if (type !== "recurring" || !days)
    return type.charAt(0).toUpperCase() + type.slice(1);

  if (days === 7) return "Weekly";
  if (days === 30 || days === 31) return "Monthly";
  if (days === 90 || days === 91 || days === 92) return "Quarterly";
  if (days === 180 || days === 182 || days === 183) return "Bi-Annually";
  if (days === 365 || days === 366) return "Annually";
  if (days === 730 || days === 731) return "Every 2 Years";

  if (days % 365 === 0) return `Every ${days / 365} Years`;
  if (days % 30 === 0) return `Every ${days / 30} Months`;

  return `Every ${days} Days`;
}

// --- Main Component ---

interface UnifiedControlsHubProps {
  initialCreateControl?: boolean;
  initialTitle?: string;
  initialQsId?: string;
  linkEvidenceId?: string;
}

export function UnifiedControlsHub({
  initialCreateControl,
  initialTitle,
  initialQsId,
  linkEvidenceId,
}: UnifiedControlsHubProps = {}) {
  const { activeSite } = useSite();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  const [editControl, setEditControl] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [pendingLinkEvidenceId, setPendingLinkEvidenceId] = useState<
    string | null
  >(linkEvidenceId || null);

  const [activeFilters, setActiveFilters] = useState<{
    frequency: string[];
    reviewer: string[];
    keyQuestion: string[];
  }>({
    frequency: [],
    reviewer: [],
    keyQuestion: [],
  });

  // Data Fetching
  const { data: checklistData, isLoading: isChecklistLoading } = useQuery({
    queryKey: ["checklist-data", activeSite?.id],
    queryFn: () => getChecklistDataFn({ data: { siteId: activeSite?.id } }),
    enabled: !!activeSite?.id,
  });

  const { data: controlsData, isLoading: isControlsLoading } = useQuery({
    queryKey: ["local-controls", activeSite?.id],
    queryFn: () => getLocalControlsFn({ data: { siteId: activeSite?.id } }),
    enabled: !!activeSite?.id,
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
    },
  });

  const seedMutation = useMutation({
    mutationFn: seedLocalControlsFn,
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`Imported ${res.seeded} starter controls!`);
        queryClient.invalidateQueries({ queryKey: ["local-controls"] });
        queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
      }
    },
  });

  // Auto-open dialog when coming from documents page with createControl param
  useEffect(() => {
    if (initialCreateControl && !isDialogOpen) {
      // Set up the control with prefilled data from AI suggestion
      setEditControl({
        title: initialTitle || "",
        qsId: initialQsId || "",
        active: true,
      });
      setIsDialogOpen(true);
      // Clear the URL params after opening
      navigate({ to: "/checklist", replace: true });
    }
  }, [initialCreateControl, initialTitle, initialQsId]);

  // Computed Values
  const controls = useMemo(() => {
    if (!controlsData?.controls) return [];

    return controlsData.controls.map((c) => {
      const hasEvidence = c.lastEvidenceAt !== null;

      // Calculate next due date from last evidence + frequency
      let nextDueAt: Date | null = null;
      if (hasEvidence && c.frequencyType === "recurring" && c.frequencyDays) {
        nextDueAt = addDays(new Date(c.lastEvidenceAt!), c.frequencyDays);
      }

      const isOverdue = nextDueAt && isPast(nextDueAt) && !isToday(nextDueAt);
      const isDueSoon =
        nextDueAt && !isOverdue && nextDueAt < addDays(new Date(), 7);
      const isOnTrack = hasEvidence && !isOverdue;

      let status: "overdue" | "due-soon" | "on-track" | "not-started" =
        "not-started";
      if (isOverdue) status = "overdue";
      else if (isDueSoon) status = "due-soon";
      else if (isOnTrack) status = "on-track";

      return { ...c, computedStatus: status, computedNextDueAt: nextDueAt };
    });
  }, [controlsData?.controls]);

  const statusCounts = useMemo(() => {
    return {
      all: controls.length,
      overdue: controls.filter((c) => c.computedStatus === "overdue").length,
      "due-soon": controls.filter((c) => c.computedStatus === "due-soon")
        .length,
      "on-track": controls.filter((c) => c.computedStatus === "on-track")
        .length,
      "not-started": controls.filter((c) => c.computedStatus === "not-started")
        .length,
    };
  }, [controls]);

  const filteredControls = useMemo(() => {
    return controls.filter((c) => {
      // Tab Filter
      if (activeStatusTab !== "all" && c.computedStatus !== activeStatusTab)
        return false;

      // Search Filter
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.qs?.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Property Filters
      if (activeFilters.frequency.length > 0) {
        const freqLabel = formatFrequency(
          c.frequencyType,
          c.frequencyDays,
        ).toLowerCase();
        if (
          !activeFilters.frequency.some((f) =>
            freqLabel.includes(f.toLowerCase()),
          )
        )
          return false;
      }

      if (activeFilters.reviewer.length > 0) {
        if (
          !activeFilters.reviewer.includes(
            c.defaultReviewerRole || "Unassigned",
          )
        )
          return false;
      }

      if (activeFilters.keyQuestion.length > 0) {
        const kq = c.qsId?.split(".")[0] || "";
        if (!activeFilters.keyQuestion.includes(kq)) return false;
      }

      return true;
    });
  }, [controls, searchQuery, activeStatusTab, activeFilters]);

  // Key Question display names and metadata
  const keyQuestionMeta: Record<
    string,
    {
      icon: typeof Shield;
      color: string;
      bgColor: string;
      label: string;
      order: number;
    }
  > = {
    safe: {
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      label: "Safe",
      order: 1,
    },
    effective: {
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      label: "Effective",
      order: 2,
    },
    caring: {
      icon: Heart,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950/30",
      label: "Caring",
      order: 3,
    },
    responsive: {
      icon: Zap,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      label: "Responsive",
      order: 4,
    },
    well_led: {
      icon: Users,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
      label: "Well-led",
      order: 5,
    },
  };

  // Group controls by Key Question -> Quality Statement
  const groupedByKeyQuestion = useMemo(() => {
    const kqGroups: Record<
      string,
      {
        kqId: string;
        kqTitle: string;
        qualityStatements: Record<
          string,
          { qsId: string; qsTitle: string; controls: any[] }
        >;
      }
    > = {};

    filteredControls.forEach((control) => {
      // Extract Key Question from qsId (format: "safe.learning_culture")
      const kqId = control.qsId?.split(".")[0] || "unknown";
      // Use the label from meta, or fallback to formatted ID
      const kqTitle =
        keyQuestionMeta[kqId]?.label ||
        kqId.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const qsTitle = control.qs?.title || control.qsId || "General Controls";
      const qsId = control.qsId || "general";

      if (!kqGroups[kqId]) {
        kqGroups[kqId] = {
          kqId,
          kqTitle,
          qualityStatements: {},
        };
      }

      if (!kqGroups[kqId].qualityStatements[qsTitle]) {
        kqGroups[kqId].qualityStatements[qsTitle] = {
          qsId,
          qsTitle,
          controls: [],
        };
      }

      kqGroups[kqId].qualityStatements[qsTitle].controls.push(control);
    });

    // Sort by Key Question order
    return Object.values(kqGroups).sort((a, b) => {
      const orderA = keyQuestionMeta[a.kqId]?.order || 99;
      const orderB = keyQuestionMeta[b.kqId]?.order || 99;
      return orderA - orderB;
    });
  }, [filteredControls]);

  const toggleFilter = (type: keyof typeof activeFilters, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[type];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3 md:space-y-4 flex-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Compliance Controls Hub
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage, track, and evidence your service standards.
            </p>
          </div>

          <div className="bg-card p-3 md:p-4 rounded-xl border shadow-sm max-w-xl transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm font-medium">
                Overall Compliance Status
              </span>
              <span className="text-xs md:text-sm font-bold text-primary">
                {overallProgress}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
          {controls.length === 0 && (
            <Button
              variant="outline"
              onClick={() =>
                seedMutation.mutate({ data: { siteId: activeSite?.id } })
              }
              disabled={seedMutation.isPending}
              className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm hover:shadow transition-all text-xs md:text-sm"
            >
              {seedMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
              ) : (
                <PackagePlus className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              )}
              <span className="hidden sm:inline">Import Starter Pack</span>
              <span className="sm:hidden">Import</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setIsAIOpen(true)}
            className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-sm hover:shadow transition-all text-xs md:text-sm"
          >
            <Sparkles className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">AI Suggestions</span>
            <span className="sm:hidden">AI</span>
          </Button>
          <Button
            onClick={() => {
              setEditControl(null);
              setIsDialogOpen(true);
            }}
            className="shadow-sm hover:shadow transition-all text-xs md:text-sm"
          >
            <Plus className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Add Control</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Navigation & Filters */}
      <div className="space-y-3">
        <Tabs
          value={activeStatusTab}
          onValueChange={setActiveStatusTab}
          className="w-full"
        >
          <TabsList className="bg-muted/50 p-0.5">
            <TabsTrigger
              value="overdue"
              className="data-[state=active]:bg-rose-500 data-[state=active]:text-white text-xs md:text-sm transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">
                Overdue ({statusCounts.overdue})
              </span>
              <span className="sm:hidden">{statusCounts.overdue}</span>
            </TabsTrigger>
            <TabsTrigger
              value="due-soon"
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-xs md:text-sm transition-all hover:bg-amber-50 dark:hover:bg-amber-950/20"
            >
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">
                Due Soon ({statusCounts["due-soon"]})
              </span>
              <span className="sm:hidden">{statusCounts["due-soon"]}</span>
            </TabsTrigger>
            <TabsTrigger
              value="on-track"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs md:text-sm transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">
                On Track ({statusCounts["on-track"]})
              </span>
              <span className="sm:hidden">{statusCounts["on-track"]}</span>
            </TabsTrigger>
            <TabsTrigger
              value="not-started"
              className="data-[state=active]:bg-slate-500 data-[state=active]:text-white text-xs md:text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-950/20"
            >
              <CircleDot className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">
                Not Started ({statusCounts["not-started"]})
              </span>
              <span className="sm:hidden">{statusCounts["not-started"]}</span>
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="text-xs md:text-sm transition-all hover:bg-accent"
            >
              <List className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">All ({statusCounts.all})</span>
              <span className="sm:hidden">{statusCounts.all}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-card p-3 rounded-lg border shadow-sm transition-shadow hover:shadow-md">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search controls..."
              className="pl-9 bg-background h-9 text-sm transition-shadow focus:shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <FilterDropdown
              label="Key Question"
              options={[
                "safe",
                "effective",
                "caring",
                "responsive",
                "well_led",
              ]}
              selected={activeFilters.keyQuestion}
              onToggle={(v) => toggleFilter("keyQuestion", v)}
            />
            <FilterDropdown
              label="Frequency"
              options={["Weekly", "Monthly", "Quarterly", "Annually"]}
              selected={activeFilters.frequency}
              onToggle={(v) => toggleFilter("frequency", v)}
            />
            <FilterDropdown
              label="Reviewer"
              options={[
                "Practice Manager",
                "Nurse Lead",
                "GP Partner",
                "Trainee",
              ]}
              selected={activeFilters.reviewer}
              onToggle={(v) => toggleFilter("reviewer", v)}
            />

            {(searchQuery ||
              activeFilters.frequency.length > 0 ||
              activeFilters.reviewer.length > 0 ||
              activeFilters.keyQuestion.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilters({
                    frequency: [],
                    reviewer: [],
                    keyQuestion: [],
                  });
                }}
                className="text-muted-foreground hover:text-foreground text-xs h-8 transition-colors"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grouped Controls List - Hierarchical by Key Question */}
      <div className="space-y-6">
        {groupedByKeyQuestion.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-muted-foreground/20">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground opacity-20" />
            </div>
            {controls.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-foreground">
                  No controls yet
                </h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                  Get started quickly with our curated starter pack, or add
                  controls manually.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Button
                    onClick={() =>
                      seedMutation.mutate({ data: { siteId: activeSite?.id } })
                    }
                    disabled={seedMutation.isPending}
                    className="gap-2"
                  >
                    {seedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackagePlus className="h-4 w-4" />
                    )}
                    Import Starter Pack
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditControl(null);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Manually
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-foreground">
                  No controls found
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Try adjusting your filters or search query.
                </p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => {
                    setActiveStatusTab("all");
                    setSearchQuery("");
                    setActiveFilters({
                      frequency: [],
                      reviewer: [],
                      keyQuestion: [],
                    });
                  }}
                >
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByKeyQuestion.map((kqGroup) => {
              const meta = keyQuestionMeta[kqGroup.kqId] || {
                icon: CheckCircle2,
                color: "text-muted-foreground",
                bgColor: "bg-muted",
                label: kqGroup.kqTitle,
                order: 99,
              };
              const KqIcon = meta.icon;
              const totalControls = Object.values(
                kqGroup.qualityStatements,
              ).reduce((sum, qs) => sum + qs.controls.length, 0);

              return (
                <KeyQuestionSection
                  key={kqGroup.kqId}
                  kqId={kqGroup.kqId}
                  kqTitle={kqGroup.kqTitle}
                  KqIcon={KqIcon}
                  iconColor={meta.color}
                  bgColor={meta.bgColor}
                  totalControls={totalControls}
                  qualityStatements={kqGroup.qualityStatements}
                  siteId={activeSite?.id || ""}
                  onEditControl={(control: any) => {
                    setEditControl(control);
                    setIsDialogOpen(true);
                  }}
                  onDeleteControl={(id: string) =>
                    deleteMutation.mutate({ data: { id } })
                  }
                  onSelectSuggestion={(s: any, qsId: string) => {
                    setEditControl({
                      ...s,
                      qsId,
                      active: true,
                      evidenceExamples: JSON.stringify(
                        s.evidenceExamples || { good: [], bad: [] },
                      ),
                    });
                    setIsDialogOpen(true);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ControlDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        control={editControl}
        siteId={activeSite?.id}
        onClose={() => {
          setIsDialogOpen(false);
          setEditControl(null);
          setPendingLinkEvidenceId(null);
        }}
        qsList={qsData?.qualityStatements || []}
        linkEvidenceId={pendingLinkEvidenceId}
        onControlCreated={(_controlId: string) => {
          // Clear the pending evidence ID after linking
          setPendingLinkEvidenceId(null);
        }}
      />

      <SuggestControlsDialog
        open={isAIOpen}
        onOpenChange={setIsAIOpen}
        qsList={qsData?.qualityStatements || []}
        onSelectSuggestion={(s) => {
          setEditControl({
            ...s,
            active: true,
            evidenceExamples: JSON.stringify(
              s.evidenceExamples || { good: [], bad: [] },
            ),
          });
          setIsDialogOpen(true);
        }}
      />
    </div>
  );
}

// --- Sub-components ---

// Creative status indicator showing distribution as colored segments
function StatusSegments({ controls }: { controls: any[] }) {
  const counts = {
    overdue: controls.filter((c) => c.computedStatus === "overdue").length,
    "due-soon": controls.filter((c) => c.computedStatus === "due-soon").length,
    "on-track": controls.filter((c) => c.computedStatus === "on-track").length,
    "not-started": controls.filter((c) => c.computedStatus === "not-started")
      .length,
  };

  const total = controls.length;
  if (total === 0) return null;

  const segments = [
    { key: "on-track", color: "bg-emerald-500", count: counts["on-track"] },
    { key: "due-soon", color: "bg-amber-500", count: counts["due-soon"] },
    { key: "overdue", color: "bg-rose-500", count: counts.overdue },
    {
      key: "not-started",
      color: "bg-slate-300 dark:bg-slate-600",
      count: counts["not-started"],
    },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex items-center gap-1">
      {/* Stacked segment bar */}
      <div className="flex h-2 w-20 rounded-full overflow-hidden bg-muted/50">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={cn("h-full transition-all", seg.color)}
            style={{ width: `${(seg.count / total) * 100}%` }}
          />
        ))}
      </div>
      {/* Completion text */}
      <span
        className={cn(
          "text-[10px] font-medium tabular-nums ml-1",
          counts["on-track"] === total
            ? "text-emerald-600"
            : "text-muted-foreground",
        )}
      >
        {counts["on-track"]}/{total}
      </span>
    </div>
  );
}

// Mini dot grid showing each control's status
function StatusDotGrid({
  controls,
  max = 12,
}: {
  controls: any[];
  max?: number;
}) {
  const statusColors = {
    overdue: "bg-rose-500",
    "due-soon": "bg-amber-500",
    "on-track": "bg-emerald-500",
    "not-started": "bg-slate-300 dark:bg-slate-600",
  };

  const displayControls = controls.slice(0, max);
  const remaining = controls.length - max;

  return (
    <div className="flex items-center gap-0.5">
      {displayControls.map((c, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-[2px] transition-all",
            statusColors[c.computedStatus as keyof typeof statusColors],
          )}
        />
      ))}
      {remaining > 0 && (
        <span className="text-[9px] text-muted-foreground ml-1">
          +{remaining}
        </span>
      )}
    </div>
  );
}

function KeyQuestionSection({
  kqTitle,
  KqIcon,
  iconColor,
  bgColor,
  qualityStatements,
  siteId,
  onEditControl,
  onDeleteControl,
  onSelectSuggestion,
}: {
  kqId: string;
  kqTitle: string;
  KqIcon: any;
  iconColor: string;
  bgColor: string;
  totalControls: number;
  qualityStatements: Record<
    string,
    { qsId: string; qsTitle: string; controls: any[] }
  >;
  siteId: string;
  onEditControl: (control: any) => void;
  onDeleteControl: (id: string) => void;
  onSelectSuggestion: (s: any, qsId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const qsCount = Object.keys(qualityStatements).length;

  // Get all controls for this Key Question
  const allControls = Object.values(qualityStatements).flatMap(
    (qs) => qs.controls,
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-3 md:gap-4 rounded-lg transition-all duration-200",
            "hover:bg-accent/50 hover:shadow-sm border border-transparent hover:border-border/30",
            isOpen && bgColor,
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg transition-all duration-200",
              iconColor,
              isOpen
                ? "bg-background shadow-sm scale-105"
                : "bg-muted/60 group-hover:scale-105",
            )}
          >
            <KqIcon className="h-4 w-4 md:h-4.5 md:w-4.5" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <h3 className="font-semibold text-sm md:text-[15px] text-foreground">
                {kqTitle}
              </h3>
              <StatusSegments controls={allControls} />
            </div>
            <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5">
              {qsCount} quality statement{qsCount !== 1 ? "s" : ""}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground/60 transition-transform duration-200 shrink-0",
              !isOpen && "-rotate-90",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="ml-5 md:ml-13 border-l border-border/60 pl-3 md:pl-4 pb-2 space-y-1 mt-1">
          {Object.entries(qualityStatements).map(
            ([qsTitle, { qsId, controls }], idx) => (
              <QualityStatementSection
                key={qsId}
                qsId={qsId}
                qsTitle={qsTitle}
                controls={controls}
                siteId={siteId}
                onEditControl={onEditControl}
                onDeleteControl={onDeleteControl}
                onSelectSuggestion={(s) => onSelectSuggestion(s, qsId)}
                isLast={idx === Object.keys(qualityStatements).length - 1}
              />
            ),
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function QualityStatementSection({
  qsId,
  qsTitle,
  controls,
  siteId,
  onEditControl,
  onDeleteControl,
  onSelectSuggestion,
  isLast,
}: {
  qsId: string;
  qsTitle: string;
  controls: any[];
  siteId: string;
  onEditControl: (control: any) => void;
  onDeleteControl: (id: string) => void;
  onSelectSuggestion: (s: any) => void;
  isLast?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(!isLast && "pb-0.5")}
    >
      <CollapsibleTrigger asChild>
        <button className="w-full py-2 px-2 md:px-3 flex items-center gap-2 md:gap-3 rounded-md hover:bg-accent/50 hover:shadow-sm transition-all text-left group/qs">
          <ChevronRight
            className={cn(
              "h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0 group-hover/qs:text-muted-foreground",
              isOpen && "rotate-90",
            )}
          />
          <span className="font-medium text-xs md:text-[13px] text-foreground/90 truncate flex-1 group-hover/qs:text-foreground transition-colors">
            {qsTitle}
          </span>
          <StatusDotGrid controls={controls} max={8} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-5 pr-2 pb-3 pt-1 space-y-1">
          {controls.map((control) => (
            <ControlHubRow
              key={control.id}
              control={control}
              siteId={siteId}
              onEdit={() => onEditControl(control)}
              onDelete={() => onDeleteControl(control.id)}
            />
          ))}

          <InlineAISuggestion
            qsId={qsId}
            siteId={siteId}
            onSelectSuggestion={onSelectSuggestion}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ControlHubRow({
  control,
  siteId,
  onEdit,
  onDelete,
}: {
  control: any;
  siteId: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    overdue: { dot: "bg-rose-500", text: "text-rose-600", label: "Overdue" },
    "due-soon": {
      dot: "bg-amber-500",
      text: "text-amber-600",
      label: "Due Soon",
    },
    "on-track": {
      dot: "bg-emerald-500",
      text: "text-emerald-600",
      label: "On Track",
    },
    "not-started": {
      dot: "bg-slate-300 dark:bg-slate-600",
      text: "text-muted-foreground",
      label: "Not Started",
    },
  };

  const status = control.computedStatus as keyof typeof statusConfig;
  const config = statusConfig[status];

  const nextDueAt = control.computedNextDueAt;
  const nextDueLabel = nextDueAt
    ? `${isPast(new Date(nextDueAt)) ? "Was due" : "Due"} ${format(new Date(nextDueAt), "MMM d")}`
    : null;

  return (
    <div
      className={cn(
        "group rounded-lg transition-all duration-200",
        "hover:bg-accent/40 hover:shadow-sm border border-transparent hover:border-border/50",
        isExpanded && "bg-accent/30 border-border/50 shadow-sm",
      )}
    >
      <div className="px-2 md:px-3 py-2 md:py-2.5 flex items-start md:items-center gap-2 md:gap-3">
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 md:mt-0",
            config.dot,
          )}
          title={config.label}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="font-medium text-xs md:text-[13px] text-foreground hover:text-primary transition-colors text-left hover:underline decoration-primary/30"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {control.title}
            </button>
            {control.sourcePackId && (
              <span className="text-[8px] md:text-[9px] font-semibold uppercase tracking-wide text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                Pack
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mt-1 text-[10px] md:text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {formatFrequency(control.frequencyType, control.frequencyDays)}
              </span>
            </div>
            <span className="hidden md:inline text-muted-foreground/40">•</span>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 md:ml-2" />
              <span className="truncate max-w-30">
                {control.defaultReviewerRole || "Unassigned"}
              </span>
            </div>
            {nextDueLabel && (
              <>
                <span className="hidden md:inline text-muted-foreground/40">
                  •
                </span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 md:ml-2" />
                  <span
                    className={cn(
                      status === "overdue" && config.text,
                      "font-medium",
                    )}
                  >
                    {nextDueLabel}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          <UploadModal
            siteId={siteId}
            initialQsId={control.qsId}
            initialControlId={control.id}
            trigger={
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-1.5 md:px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <Upload className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1" />
                <span className="hidden md:inline sr-only">Upload</span>
              </Button>
            }
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs"
              >
                <FileText className="mr-2 h-3.5 w-3.5" />{" "}
                {isExpanded ? "Hide" : "View"} Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-600 text-xs"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 ml-4.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="border-l-2 border-muted pl-4 space-y-3">
            {control.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {control.description}
              </p>
            )}

            {control.evidenceHint && (
              <div className="text-xs">
                <span className="text-muted-foreground">Evidence needed:</span>
                <span className="ml-1.5">{control.evidenceHint}</span>
              </div>
            )}

            <EvidenceExamplesSection
              evidenceExamples={control.evidenceExamples}
              variant="minimal"
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
              <span>
                Last evidence:{" "}
                {control.lastEvidenceAt
                  ? format(new Date(control.lastEvidenceAt), "MMM d, yyyy")
                  : "Never"}
              </span>
              {control.defaultReviewerRole && (
                <span>Reviewer: {control.defaultReviewerRole}</span>
              )}
              {control.fallbackReviewerRole && (
                <span>Fallback: {control.fallbackReviewerRole}</span>
              )}
              {control.cqcMythbusterUrl && (
                <a
                  href={control.cqcMythbusterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ArrowRight className="h-3 w-3" /> CQC Mythbuster
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineAISuggestion({
  qsId,
  siteId,
  onSelectSuggestion,
}: {
  qsId: string;
  siteId: string;
  onSelectSuggestion: (s: any) => void;
}) {
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
    <div className="mt-2">
      <button
        onClick={handleSuggest}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors group py-1"
      >
        <Sparkles className="h-3 w-3 group-hover:text-primary transition-colors" />
        <span>Get AI suggestions</span>
        {suggestMutation.isPending && (
          <Loader2 className="h-2.5 w-2.5 animate-spin ml-1" />
        )}
      </button>

      {isOpen && suggestMutation.data?.suggestions && (
        <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {suggestMutation.data.suggestions.map((s: any, i: number) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group/suggestion"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[12px] text-foreground/80 truncate">
                    {s.title}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-medium uppercase px-1.5 py-0.5 rounded",
                      s.priority === "high"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        : s.priority === "medium"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {s.priority}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {s.description}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSelectSuggestion(s)}
                className="h-6 px-2 text-[10px] opacity-0 group-hover/suggestion:opacity-100 transition-opacity"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {isOpen && suggestMutation.isPending && (
        <div className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
          <Wand2 className="h-4 w-4 animate-pulse" />
          <span className="text-[11px]">Analyzing...</span>
        </div>
      )}
    </div>
  );
}

// Display labels for Key Question filter values
const keyQuestionLabels: Record<string, string> = {
  safe: "Safe",
  effective: "Effective",
  caring: "Caring",
  responsive: "Responsive",
  well_led: "Well-led",
};

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const getDisplayLabel = (opt: string) => keyQuestionLabels[opt] || opt;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 text-xs border-dashed bg-background",
            selected.length > 0 &&
              "bg-primary/5 border-primary/40 text-primary",
          )}
        >
          {label}
          {selected.length > 0 && (
            <span className="ml-1.5 bg-primary/20 text-primary px-1.5 rounded-sm text-[10px] font-bold">
              {selected.length}
            </span>
          )}
          <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            onCheckedChange={() => onToggle(opt)}
            className="text-xs"
          >
            {getDisplayLabel(opt)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Reuse/Refactor these from LocalControlsManager or similar
function ControlDialog({
  open,
  onOpenChange,
  control,
  siteId,
  onClose,
  qsList,
  linkEvidenceId,
  onControlCreated,
}: any) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isEdit = !!control?.id;
  const [activeTab, setActiveTab] = useState("basic");
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);

  const [formData, setFormData] = useState({
    qsId: "",
    title: "",
    description: "",
    frequencyType: "recurring",
    frequencyDays: 30,
    evidenceHint: "",
    defaultReviewerRole: "Practice Manager",
    fallbackReviewerRole: "",
    active: true,
    cqcMythbusterUrl: "",
    goodExamples: "",
    badExamples: "",
  });

  // Track if we've already generated details for this session
  const [hasGeneratedDetails, setHasGeneratedDetails] = useState(false);

  useMemo(() => {
    if (open) {
      if (control) {
        let good = "",
          bad = "";
        try {
          if (control.evidenceExamples) {
            const parsed =
              typeof control.evidenceExamples === "string"
                ? JSON.parse(control.evidenceExamples)
                : control.evidenceExamples;
            good = parsed.good?.join("\n") || "";
            bad = parsed.bad?.join("\n") || "";
          }
        } catch (e) {}

        setFormData({
          qsId: control.qsId || qsList[0]?.id || "",
          title: control.title || "",
          description: control.description || "",
          frequencyType: control.frequencyType || "recurring",
          frequencyDays: control.frequencyDays || 30,
          evidenceHint: control.evidenceHint || "",
          defaultReviewerRole:
            control.defaultReviewerRole || "Practice Manager",
          fallbackReviewerRole: control.fallbackReviewerRole || "",
          active: control.active !== false,
          cqcMythbusterUrl: control.cqcMythbusterUrl || "",
          goodExamples: good,
          badExamples: bad,
        });
      } else {
        setFormData({
          qsId: qsList[0]?.id || "",
          title: "",
          description: "",
          frequencyType: "recurring",
          frequencyDays: 30,
          evidenceHint: "",
          defaultReviewerRole: "Practice Manager",
          fallbackReviewerRole: "",
          active: true,
          cqcMythbusterUrl: "",
          goodExamples: "",
          badExamples: "",
        });
      }
      // Reset generation flag when dialog opens fresh
      setHasGeneratedDetails(false);
    }
  }, [open, control, qsList]);

  // Generate complete control details when opening with AI suggestion
  useEffect(() => {
    const generateDetails = async () => {
      // Only run if:
      // 1. Dialog is open
      // 2. We have a linkEvidenceId (coming from AI suggestion)
      // 3. We have a title but no description (incomplete suggestion)
      // 4. We haven't already generated details
      if (
        open &&
        linkEvidenceId &&
        control?.title &&
        !control?.description &&
        !hasGeneratedDetails
      ) {
        setIsGeneratingDetails(true);
        setHasGeneratedDetails(true);

        try {
          const details = await generateControlDetailsFn({
            data: {
              suggestedTitle: control.title,
              qsId: control.qsId || qsList[0]?.id || "",
              documentContext: control.documentContext, // Optional context from the document
            },
          });

          if (details) {
            setFormData((prev) => ({
              ...prev,
              title: details.title || prev.title,
              description: details.description || prev.description,
              frequencyType: details.frequencyType || prev.frequencyType,
              frequencyDays: details.frequencyDays || prev.frequencyDays,
              evidenceHint: details.evidenceHint || prev.evidenceHint,
              defaultReviewerRole:
                details.defaultReviewerRole || prev.defaultReviewerRole,
              fallbackReviewerRole:
                details.fallbackReviewerRole || prev.fallbackReviewerRole,
              goodExamples:
                details.evidenceExamples?.good?.join("\n") || prev.goodExamples,
              badExamples:
                details.evidenceExamples?.bad?.join("\n") || prev.badExamples,
            }));
            toast.success("AI generated control details");
          }
        } catch (err) {
          console.error("Failed to generate control details:", err);
          toast.error("Failed to generate details, using defaults");
        } finally {
          setIsGeneratingDetails(false);
        }
      }
    };

    generateDetails();
  }, [open, linkEvidenceId, control, hasGeneratedDetails, qsList]);

  const createMutation = useMutation({
    mutationFn: createLocalControlFn,
    onSuccess: async (result) => {
      toast.success("Control created");
      queryClient.invalidateQueries({ queryKey: ["local-controls"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-data"] });

      // If we have a pending evidence to link, do it now
      if (linkEvidenceId && result?.id) {
        try {
          await updateEvidenceFn({
            data: {
              evidenceId: linkEvidenceId,
              updates: {
                localControlId: result.id,
                status: "pending_review",
                reviewNotes:
                  "Control created from AI suggestion and linked by user.",
              },
            },
          });
          queryClient.invalidateQueries({ queryKey: ["evidence"] });
          toast.success(
            "Evidence linked to the new control and submitted for review",
          );
          onControlCreated?.(result.id);
          // Navigate back to documents page
          navigate({ to: "/documents" });
        } catch (err: any) {
          toast.error(
            "Control created but failed to link evidence: " + err.message,
          );
        }
      }

      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateLocalControlFn,
    onSuccess: () => {
      toast.success("Control updated");
      queryClient.invalidateQueries({ queryKey: ["local-controls"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending =
    createMutation.isPending || updateMutation.isPending || isGeneratingDetails;

  const handleSubmit = () => {
    if (!formData.title) return toast.error("Title is required");
    if (!formData.qsId) return toast.error("Area of Focus is required");

    const evidenceExamples = JSON.stringify({
      good: formData.goodExamples.split("\n").filter((s) => s.trim()),
      bad: formData.badExamples.split("\n").filter((s) => s.trim()),
    });

    const payload = {
      title: formData.title,
      description: formData.description,
      frequencyType: formData.frequencyType as any,
      frequencyDays:
        formData.frequencyType === "recurring"
          ? formData.frequencyDays
          : undefined,
      evidenceHint: formData.evidenceHint,
      defaultReviewerRole: formData.defaultReviewerRole,
      fallbackReviewerRole: formData.fallbackReviewerRole,
      active: formData.active,
      evidenceExamples,
      cqcMythbusterUrl: formData.cqcMythbusterUrl,
      qsId: formData.qsId,
    };

    if (isEdit) {
      updateMutation.mutate({ data: { id: control.id, ...payload } });
    } else {
      createMutation.mutate({ data: { siteId, ...payload } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-212.5 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {linkEvidenceId ? (
              <>
                <Sparkles className="h-5 w-5 text-purple-600" />
                Create Control from AI Suggestion
              </>
            ) : isEdit ? (
              "Edit Control"
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add New Control
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {linkEvidenceId
              ? "AI suggested a new control for your document. Customize it below and save to automatically link the document."
              : "Define the requirements for this compliance check."}
          </DialogDescription>
        </DialogHeader>

        {/* AI Generation Loading State */}
        {isGeneratingDetails && (
          <div className="bg-linear-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
              <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-purple-800 dark:text-purple-200">
                AI is generating control details...
              </p>
              <p className="text-purple-600 dark:text-purple-400 text-xs mt-0.5">
                This will pre-fill description, schedule, reviewers, and
                evidence hints.
              </p>
            </div>
          </div>
        )}

        {linkEvidenceId && !isGeneratingDetails && (
          <div className="bg-linear-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-xs">
              <p className="font-medium text-purple-800 dark:text-purple-200">
                Document will be linked automatically
              </p>
              <p className="text-purple-600 dark:text-purple-400">
                After saving, the document will be assigned to this control and
                submitted for review.
              </p>
            </div>
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="py-2">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="basic" className="text-xs">
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="evidence" className="text-xs">
              Evidence
            </TabsTrigger>
          </TabsList>

          <div className="py-4 space-y-4">
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="grid gap-2">
                <Label className="text-xs">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g. Hand Hygiene Audit"
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What does this control check for? What evidence is typically required?"
                  className="min-h-50 text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">
                  Area of Focus (Quality Statement){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.qsId}
                  onValueChange={(v) => setFormData({ ...formData, qsId: v })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Area" />
                  </SelectTrigger>
                  <SelectContent className="max-h-62.5">
                    {qsList.map((qs: any) => (
                      <SelectItem key={qs.id} value={qs.id} className="text-xs">
                        <span className="font-medium">{qs.title}</span>
                        <span className="text-muted-foreground ml-2">
                          ({qs.keyQuestionTitle})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-xs">Active Status</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Inactive controls won't appear in checklists
                  </p>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, active: c })
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs">Frequency Type</Label>
                  <Select
                    value={formData.frequencyType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, frequencyType: v })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">
                        Recurring (Regular checks)
                      </SelectItem>
                      <SelectItem value="one-off">
                        One-off (Single event)
                      </SelectItem>
                      <SelectItem value="observation">
                        Observation (As observed)
                      </SelectItem>
                      <SelectItem value="feedback">
                        Feedback (Collected feedback)
                      </SelectItem>
                      <SelectItem value="process">
                        Process (Ongoing process)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.frequencyType === "recurring" && (
                  <div className="grid gap-2">
                    <Label className="text-xs">Frequency</Label>
                    <Select
                      value={String(formData.frequencyDays)}
                      onValueChange={(v) =>
                        setFormData({ ...formData, frequencyDays: parseInt(v) })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Weekly</SelectItem>
                        <SelectItem value="14">Fortnightly</SelectItem>
                        <SelectItem value="30">Monthly</SelectItem>
                        <SelectItem value="90">Quarterly</SelectItem>
                        <SelectItem value="180">Bi-Annually</SelectItem>
                        <SelectItem value="365">Annually</SelectItem>
                        <SelectItem value="730">Every 2 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs">Default Reviewer</Label>
                  <Select
                    value={formData.defaultReviewerRole}
                    onValueChange={(v) =>
                      setFormData({ ...formData, defaultReviewerRole: v })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Practice Manager">
                        Practice Manager
                      </SelectItem>
                      <SelectItem value="Compliance Officer">
                        Compliance Officer
                      </SelectItem>
                      <SelectItem value="Nurse Lead">Nurse Lead</SelectItem>
                      <SelectItem value="GP Partner">GP Partner</SelectItem>
                      <SelectItem value="Safeguarding Lead">
                        Safeguarding Lead
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Fallback Reviewer</Label>
                  <Select
                    value={formData.fallbackReviewerRole || "none"}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        fallbackReviewerRole: v === "none" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No fallback)</SelectItem>
                      <SelectItem value="Practice Manager">
                        Practice Manager
                      </SelectItem>
                      <SelectItem value="Compliance Officer">
                        Compliance Officer
                      </SelectItem>
                      <SelectItem value="Nurse Lead">Nurse Lead</SelectItem>
                      <SelectItem value="GP Partner">GP Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="evidence" className="space-y-4 mt-0">
              <div className="grid gap-2">
                <Label className="text-xs">Evidence Hint</Label>
                <Textarea
                  value={formData.evidenceHint}
                  onChange={(e) =>
                    setFormData({ ...formData, evidenceHint: e.target.value })
                  }
                  placeholder="Describe what type of evidence should be uploaded for this control..."
                  className="min-h-25 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Good Evidence Examples
                  </Label>
                  <Textarea
                    className="min-h-50 text-xs border-emerald-200 focus-visible:ring-emerald-500"
                    value={formData.goodExamples}
                    onChange={(e) =>
                      setFormData({ ...formData, goodExamples: e.target.value })
                    }
                    placeholder="One example per line..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    Poor Evidence Examples
                  </Label>
                  <Textarea
                    className="min-h-50 text-xs border-rose-200 focus-visible:ring-rose-500"
                    value={formData.badExamples}
                    onChange={(e) =>
                      setFormData({ ...formData, badExamples: e.target.value })
                    }
                    placeholder="One example per line..."
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">CQC Mythbuster URL (Optional)</Label>
                <Input
                  value={formData.cqcMythbusterUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cqcMythbusterUrl: e.target.value,
                    })
                  }
                  placeholder="https://www.cqc.org.uk/guidance-providers/..."
                  className="h-10 text-sm"
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className={
              linkEvidenceId ? "bg-purple-600 hover:bg-purple-700" : ""
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {linkEvidenceId ? "Create & Link Document" : "Save Control"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuggestControlsDialog({
  open,
  onOpenChange,
  qsList,
  onSelectSuggestion,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  qsList: any[];
  onSelectSuggestion: (s: any) => void;
}) {
  const { activeSite } = useSite();
  const [qsId, setQsId] = useState<string>("all_areas");

  const suggestMutation = useMutation({
    mutationFn: suggestLocalControlsFn,
  });

  const handleGenerate = () => {
    suggestMutation.mutate({
      data: {
        siteId: activeSite?.id,
        qsId: qsId === "all_areas" ? undefined : qsId,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-212.5 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Control Suggestions
          </DialogTitle>
          <DialogDescription>
            Analyze your compliance gaps and get smart recommendations for
            missing controls.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 items-end bg-muted/40 p-4 rounded-lg border my-4">
          <div className="space-y-2 flex-1">
            <Label>Area of Focus</Label>
            <Select value={qsId} onValueChange={setQsId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="All Areas (General Analysis)" />
              </SelectTrigger>
              <SelectContent className="max-h-75">
                <SelectItem
                  value="all_areas"
                  className="font-medium text-primary"
                >
                  All Areas (General Analysis)
                </SelectItem>
                <DropdownMenuSeparator />
                {qsList.map((qs: any) => (
                  <SelectItem key={qs.id} value={qs.id}>
                    {qs.title}{" "}
                    <span className="text-muted-foreground text-xs">
                      ({qs.keyQuestionTitle})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={suggestMutation.isPending}
            className="min-w-35"
          >
            {suggestMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {suggestMutation.isPending ? "Analyzing..." : "Generate"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[80vh] pr-2 space-y-4">
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
                <div
                  key={i}
                  className="bg-card border rounded-xl p-4 space-y-3 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{s.title}</h4>
                        <Badge
                          className={cn(
                            "text-[10px] h-5",
                            s.priority === "high"
                              ? "bg-rose-500"
                              : s.priority === "medium"
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          )}
                        >
                          {s.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        onSelectSuggestion(s);
                        onOpenChange(false);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-xs grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-muted-foreground block mb-1 uppercase tracking-tighter">
                        Why this matters
                      </span>
                      <p>{s.reasoning}</p>
                    </div>
                    <div>
                      <span className="font-bold text-muted-foreground block mb-1 uppercase tracking-tighter">
                        AI Confidence
                      </span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={s.confidence}
                          className="h-1.5 flex-1"
                        />
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
