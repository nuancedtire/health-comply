import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Check, X, FileText, Wand2, ArrowRight } from "lucide-react";
import { ClassificationResult } from "@/types/classification";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEvidenceFn } from "@/core/functions/evidence";

type DraftItem = {
    id: string;
    title: string;
    uploadedAt: Date;
    classificationResult?: ClassificationResult | null; // Cast from any
    aiConfidence?: number | null;
    status: string;
    summary?: string | null;
    mimeType: string;
    // ... other fields
};

export function DraftsView({ drafts }: { drafts: DraftItem[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(
        drafts.length > 0 ? drafts[0].id : null
    );

    const selectedItem = drafts.find(d => d.id === selectedId);
    const queryClient = useQueryClient();

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

    const handleAcceptMatch = (item: DraftItem) => {
        if (!item.classificationResult?.matchedControlId) return;
        
        updateMutation.mutate({
            data: {
                evidenceId: item.id,
                updates: {
                    status: 'pending_review',
                    localControlId: item.classificationResult.matchedControlId,
                    reviewNotes: "Auto-matched by AI and confirmed by user."
                }
            }
        });
    };

    const handleReject = (item: DraftItem) => {
        updateMutation.mutate({
            data: {
                evidenceId: item.id,
                updates: {
                    status: 'rejected',
                    reviewNotes: "Marked as irrelevant by user."
                }
            }
        });
    };

    // Placeholder for create control - in real app this would open a dialog
    const handleCreateControl = (_item: DraftItem) => {
        alert("TODO: Open Create Control Dialog pre-filled with suggestion");
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
                                        isSelected ? "bg-muted border-primary/50" : "bg-card"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-sm truncate w-[70%]">{item.title}</span>
                                        {result?.confidence && (
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                                result.confidence > 80 ? "bg-green-100 text-green-700" :
                                                result.confidence > 40 ? "bg-yellow-100 text-yellow-700" :
                                                "bg-red-100 text-red-700"
                                            )}>
                                                {result.confidence}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {result?.type === 'match' && <Badge variant="outline" className="text-[10px] border-green-200 text-green-700">Match</Badge>}
                                        {result?.type === 'suggestion' && <Badge variant="outline" className="text-[10px] border-yellow-200 text-yellow-700">Suggestion</Badge>}
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
                                    <Button variant="outline" size="sm">
                                        View File
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        
                        <div className="flex-1 grid grid-cols-2 divide-x">
                            {/* Left: Analysis */}
                            <div className="p-6 space-y-6">
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-2">AI Analysis</h4>
                                    <div className={cn(
                                        "p-4 rounded-lg border",
                                        selectedItem.classificationResult?.type === 'match' ? "bg-green-50/50 border-green-100" :
                                        selectedItem.classificationResult?.type === 'suggestion' ? "bg-yellow-50/50 border-yellow-100" :
                                        "bg-red-50/50 border-red-100"
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

                                {selectedItem.classificationResult?.type === 'match' && (
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Matched Control</h4>
                                        <div className="p-3 border rounded-md bg-card">
                                            <p className="font-medium">{selectedItem.classificationResult.matchedControlTitle || "Unknown Control"}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedItem.classificationResult?.type === 'suggestion' && (
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Suggested Control</h4>
                                        <div className="p-3 border rounded-md bg-card border-dashed">
                                            <p className="font-medium mb-1">{selectedItem.classificationResult.suggestedControlTitle}</p>
                                            <p className="text-xs text-muted-foreground">New control suggestion</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Actions */}
                            <div className="p-6 flex flex-col justify-center gap-4 bg-muted/10">
                                {selectedItem.classificationResult?.type === 'match' && (
                                    <Button 
                                        className="w-full bg-green-600 hover:bg-green-700" 
                                        onClick={() => handleAcceptMatch(selectedItem)}
                                        disabled={updateMutation.isPending}
                                    >
                                        <Check className="mr-2 h-4 w-4" /> 
                                        Confirm Match
                                    </Button>
                                )}

                                {selectedItem.classificationResult?.type === 'suggestion' && (
                                    <>
                                        <Button 
                                            className="w-full" 
                                            variant="secondary"
                                            onClick={() => handleCreateControl(selectedItem)}
                                        >
                                            <ArrowRight className="mr-2 h-4 w-4" /> 
                                            Create & Assign Control
                                        </Button>
                                        <div className="text-center text-xs text-muted-foreground">- OR -</div>
                                        <Button variant="outline" className="w-full">
                                            Assign to Existing Control
                                        </Button>
                                    </>
                                )}

                                <Separator className="my-2" />
                                
                                <Button 
                                    variant="ghost" 
                                    className="w-full text-muted-foreground hover:text-destructive"
                                    onClick={() => handleReject(selectedItem)}
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
        </div>
    );
}
