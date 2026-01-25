import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { Check, X, FileText, Wand2, ArrowRight } from "lucide-react";
import { ClassificationResult } from "@/types/classification";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { updateEvidenceFn } from "@/core/functions/evidence";
import { getLocalControlsFn } from "@/core/functions/local-control-functions";
import { parseCsv } from "@/utils/csv";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { useEffect } from "react";
import { ChevronsUpDown, AlertCircle } from "lucide-react";
import { EvidenceDetailDialog } from "./evidence-detail-dialog";

type DraftItem = {
    id: string;
    title: string;
    uploadedAt: Date;
    classificationResult?: ClassificationResult | null; // Cast from any
    aiConfidence?: number | null;
    status: string;
    summary?: string | null;
    mimeType: string;
    matches?: string[];
    textContent?: string | null;
    siteId?: string;
    // ... other fields
};

export function DraftsView({ drafts }: { drafts: DraftItem[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(
        drafts.length > 0 ? drafts[0].id : null
    );
    const [viewDialogOpen, setViewDialogOpen] = useState(false);

    // Determines if we are in "edit control" mode for the *current* selection
    const [isEditingControl, setIsEditingControl] = useState(false);
    // Tracks the manually selected control ID. If null, it means we fallback to the AI match (or nothing).
    const [manualControlId, setManualControlId] = useState<string | null>(null);

    const selectedItem = drafts.find(d => d.id === selectedId);

    // Reset manual state when selection changes
    useEffect(() => {
        setIsEditingControl(false);
        setManualControlId(null);
    }, [selectedId]);

    const queryClient = useQueryClient();

    // Fetch site controls
    const { data: controlsData } = useQuery({
        queryKey: ['local-controls', selectedItem?.siteId],
        queryFn: () => getLocalControlsFn({ data: { siteId: selectedItem?.siteId } }),
        enabled: !!selectedItem
    });

    const controls = controlsData?.controls || [];

    const updateMutation = useMutation({
        mutationFn: updateEvidenceFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidence'] });
            if (selectedId === selectedItem?.id) {
                // Select next item if available
                const currentIndex = drafts.findIndex(d => d.id === selectedId);
                const nextItem = drafts[currentIndex + 1] || drafts[currentIndex - 1];
                setSelectedId(nextItem ? nextItem.id : null);
            }
        }
    });

    // 1. Determine "Effective" Control ID (AI match OR Manual Override)
    const effectiveControlId = manualControlId ?? selectedItem?.classificationResult?.matchedControlId;

    // 2. Resolve the Control Object
    const effectiveControl = effectiveControlId
        ? (controls.find(c => c.id === effectiveControlId) ||
            (selectedItem?.classificationResult?.matchedControlId === effectiveControlId
                ? { title: selectedItem?.classificationResult?.matchedControlTitle, id: effectiveControlId }
                : null))
        : null;

    const handleConfirm = () => {
        if (!selectedItem || !effectiveControlId) return;

        updateMutation.mutate({
            data: {
                evidenceId: selectedItem.id,
                updates: {
                    status: 'pending_review',
                    localControlId: effectiveControlId,
                    reviewNotes: manualControlId
                        ? "Manually assigned by user."
                        : "Auto-matched by AI and confirmed by user."
                }
            }
        });
    };

    const handleReject = () => {
        if (!selectedItem) return;
        updateMutation.mutate({
            data: {
                evidenceId: selectedItem.id,
                updates: {
                    status: 'rejected',
                    reviewNotes: "Marked as irrelevant by user."
                }
            }
        });
    };

    if (drafts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px] border rounded-lg bg-muted/10">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Drafts</h3>
                <p className="text-muted-foreground">All uploaded documents have been processed.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
            {/* List Column */}
            <Card className="col-span-1 flex flex-col h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Documents to Review ({drafts.length})</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                    <div className="px-4 pb-4 space-y-2">
                        {drafts.map(item => {
                            const result = item.classificationResult;
                            const isSelected = item.id === selectedId;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={cn(
                                        "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                                        isSelected ? "bg-muted dark:bg-muted/50 border-primary/50" : "bg-card"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-sm truncate w-[70%]">{item.title}</span>
                                        {result?.confidence && (
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                result.confidence > 80 ? "bg-green-100 dark:bg-green-900/20 text-green-700" :
                                                    result.confidence > 40 ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700" :
                                                        "bg-red-100 dark:bg-red-900/20 text-red-700"
                                            )}>
                                                {result.confidence}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {result?.type === 'match' && <Badge variant="outline" className="text-[10px] border-green-200 text-green-700">Match</Badge>}
                                        {result?.type === 'suggestion' && <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-700">Suggestion</Badge>}
                                        {result?.type === 'irrelevant' && <Badge variant="outline" className="text-[10px] border-red-200 text-red-700">Irrelevant</Badge>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </Card>

            {/* Detail Column */}
            <Card className="col-span-1 md:col-span-2 flex flex-col h-full">
                {selectedItem ? (
                    <>
                        <CardHeader className="border-b pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{selectedItem.title}</CardTitle>
                                    <CardDescription>Uploaded {selectedItem.uploadedAt.toLocaleDateString()}</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(true)}>
                                        View File
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <div className="flex-1 grid grid-cols-2 divide-x">
                            {/* Left: Analysis & Content */}
                            <div className="h-full flex flex-col">
                                <Tabs defaultValue="analysis" className="flex-1 flex flex-col">
                                    <div className="px-6">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="analysis">Analysis & Control</TabsTrigger>
                                            <TabsTrigger value="preview">Content Preview</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    <div className="flex-1 overflow-auto">
                                        <TabsContent value="analysis" className="p-6 space-y-6 mt-0 h-full">
                                            <div>
                                                <h4 className="text-sm font-medium text-muted-foreground mb-2">AI Analysis</h4>
                                                <div className={cn(
                                                    "p-4 rounded-lg border",
                                                    selectedItem.classificationResult?.type === 'match' ? "bg-green-50/50 dark:bg-green-900/20 border-green-100" :
                                                        selectedItem.classificationResult?.type === 'suggestion' ? "bg-purple-50/50 dark:bg-purple-900/20 border-purple-100" :
                                                            "bg-red-50/50 dark:bg-red-900/20 border-red-100"
                                                )}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Wand2 className="h-4 w-4" />
                                                        <span className="font-semibold capitalize">
                                                            {selectedItem.classificationResult?.type || "Unclassified"}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedItem.classificationResult?.reasoning || selectedItem.summary || "No analysis available."}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Target Control (Unified Card) */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-medium text-muted-foreground">
                                                        Target Control
                                                    </h4>
                                                    {!isEditingControl && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-xs"
                                                            onClick={() => setIsEditingControl(true)}
                                                        >
                                                            Change
                                                        </Button>
                                                    )}
                                                </div>

                                                {isEditingControl ? (
                                                    <div className="space-y-2">
                                                        <Popover open={true} onOpenChange={(open) => { if (!open) setIsEditingControl(false); }}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    className="w-full justify-between font-normal"
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
                                                                            {controls.map((control) => (
                                                                                <CommandItem
                                                                                    key={control.id}
                                                                                    value={control.title}
                                                                                    onSelect={() => {
                                                                                        setManualControlId(control.id);
                                                                                        setIsEditingControl(false);
                                                                                    }}
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            "mr-2 h-4 w-4",
                                                                                            effectiveControlId === control.id ? "opacity-100" : "opacity-0"
                                                                                        )}
                                                                                    />
                                                                                    {control.title}
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <div className="flex justify-end">
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsEditingControl(false)}>Cancel</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "p-3 border rounded-md bg-card transition-colors",
                                                        manualControlId ? "border-primary/20 bg-primary/5" : ""
                                                    )}>
                                                        {/* Case 1: Manual Override or Matched Existing Control */}
                                                        {effectiveControl ? (
                                                            <>
                                                                <p className="font-medium">{effectiveControl.title || "Unknown Control"}</p>
                                                                {manualControlId && <p className="text-xs text-primary mt-1 flex items-center"><Check className="h-3 w-3 mr-1" /> Manually Selected</p>}
                                                                {!manualControlId && selectedItem.classificationResult?.type === 'match' && (
                                                                    <p className="text-xs text-green-600 mt-1">Matched by AI</p>
                                                                )}
                                                            </>
                                                        ) : selectedItem.classificationResult?.suggestedControlTitle ? (
                                                            // Case 2: AI Suggestion for NEW Control
                                                            <div className="flex items-start gap-3 p-3 rounded-md bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-purple-100/50 dark:border-purple-800/50 relative overflow-hidden">
                                                                {/* Gradient overlay for extra shine */}
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 opacity-50 pointer-events-none" />

                                                                <Wand2 className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />

                                                                <div className="relative">
                                                                    <p className="font-semibold text-sm bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent leading-snug">
                                                                        {selectedItem.classificationResult.suggestedControlTitle}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // Case 3: No Selection / No Suggestion
                                                            <div className="flex items-center text-muted-foreground">
                                                                <AlertCircle className="h-4 w-4 mr-2" />
                                                                <p className="text-sm">No control selected</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="preview" className="p-6 mt-0 h-full overflow-auto">
                                            {selectedItem.textContent ? (
                                                selectedItem.mimeType === 'text/csv' || selectedItem.title.endsWith('.csv') ? (
                                                    <div className="rounded-md border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    {parseCsv(selectedItem.textContent)[0]?.map((header, i) => (
                                                                        <TableHead key={i}>{header}</TableHead>
                                                                    ))}
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {parseCsv(selectedItem.textContent).slice(1).map((row, i) => (
                                                                    <TableRow key={i}>
                                                                        {row.map((cell, j) => (
                                                                            <TableCell key={j}>{cell}</TableCell>
                                                                        ))}
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        <Markdown remarkPlugins={[remarkGfm]}>
                                                            {selectedItem.textContent}
                                                        </Markdown>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                                                    <p>No text content available.</p>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </div>

                            {/* Right: Actions */}
                            <div className="p-6 flex flex-col justify-center gap-4 bg-muted/10 h-full">
                                {effectiveControlId ? (
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        onClick={handleConfirm}
                                        disabled={updateMutation.isPending}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Confirm Assignment
                                    </Button>
                                ) : selectedItem.classificationResult?.suggestedControlTitle ? (
                                    <Button
                                        className="w-full"
                                        variant="secondary"
                                        onClick={() => {
                                            // TODO: Real implementation would call createLocalControlFn
                                            // For now, we simulate success or show alert
                                            alert(`TODO: Create control '${selectedItem.classificationResult?.suggestedControlTitle}' and assign.`);
                                        }}
                                        disabled={updateMutation.isPending}
                                    >
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                        Create & Assign
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full"
                                        disabled={true}
                                    >
                                        Select Control to Proceed
                                    </Button>
                                )}

                                <Separator className="my-2" />

                                <Button
                                    variant="ghost"
                                    className="w-full text-muted-foreground hover:text-destructive"
                                    onClick={handleReject}
                                    disabled={updateMutation.isPending}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Mark as Irrelevant
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Select a document to review
                    </div>
                )}
            </Card>

            <EvidenceDetailDialog
                evidence={selectedItem}
                open={viewDialogOpen}
                onOpenChange={setViewDialogOpen}
            />
        </div>
    );
}


