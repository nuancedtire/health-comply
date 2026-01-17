import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPackControlsFn, importControlPackFn } from "@/core/functions/control-pack-functions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Import, CheckSquare, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSite } from "@/components/site-context";

interface ControlPackPreviewProps {
    packId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ControlPackPreview({ packId, open, onOpenChange }: ControlPackPreviewProps) {
    const { activeSite } = useSite();
    const queryClient = useQueryClient();
    const [selectedControls, setSelectedControls] = useState<string[]>([]);

    const { data, isLoading } = useQuery({
        queryKey: ["pack-controls", packId],
        queryFn: () => getPackControlsFn({ data: { packId: packId! } }),
        enabled: !!packId && open
    });

    // Reset selection when dialog opens with new data
    useEffect(() => {
        if (open && data?.controls) {
            setSelectedControls(data.controls.map(c => c.title));
        }
    }, [open, data]);

    const importMutation = useMutation({
        mutationFn: importControlPackFn,
        onSuccess: (res) => {
            if (res.success) {
                toast.success(res.message);
                queryClient.invalidateQueries({ queryKey: ["local-controls"] });
                queryClient.invalidateQueries({ queryKey: ["imported-packs"] });
                onOpenChange(false);
            }
        },
        onError: (err) => {
            toast.error("Failed to import controls: " + err.message);
        }
    });

    const handleImport = () => {
        if (!packId || !activeSite?.id) return;
        
        importMutation.mutate({
            data: {
                packId,
                controlTitles: selectedControls,
                siteId: activeSite.id
            }
        });
    };

    const toggleControl = (title: string) => {
        setSelectedControls(prev => 
            prev.includes(title) 
                ? prev.filter(t => t !== title)
                : [...prev, title]
        );
    };

    const toggleAll = () => {
        if (!data?.controls) return;
        if (selectedControls.length === data.controls.length) {
            setSelectedControls([]);
        } else {
            setSelectedControls(data.controls.map(c => c.title));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        {isLoading ? "Loading Pack..." : data?.packName}
                    </DialogTitle>
                    <DialogDescription>
                        Review and select the controls you want to import from this pack.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px] flex flex-col">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center py-2 border-b">
                                <div className="text-sm text-muted-foreground">
                                    {selectedControls.length} of {data?.controls.length} selected
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={toggleAll}
                                    className="h-8"
                                >
                                    {selectedControls.length === data?.controls.length ? (
                                        <><Square className="mr-2 h-4 w-4" /> Deselect All</>
                                    ) : (
                                        <><CheckSquare className="mr-2 h-4 w-4" /> Select All</>
                                    )}
                                </Button>
                            </div>
                            
                            <ScrollArea className="flex-1 -mr-4 pr-4">
                                <div className="space-y-1 py-2">
                                    {data?.controls.map((control) => (
                                        <div 
                                            key={control.title} 
                                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                                        >
                                            <Checkbox 
                                                id={`control-${control.title}`}
                                                checked={selectedControls.includes(control.title)}
                                                onCheckedChange={() => toggleControl(control.title)}
                                                className="mt-1"
                                            />
                                            <div className="grid gap-1.5 leading-none w-full">
                                                <div className="flex items-center justify-between gap-2">
                                                    <label
                                                        htmlFor={`control-${control.title}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {control.title}
                                                    </label>
                                                    <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                                                        {control.frequencyDays} Days
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {control.evidenceHint || "No evidence hint provided."}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={importMutation.isPending || selectedControls.length === 0}>
                        {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Import className="mr-2 h-4 w-4" />
                        Import {selectedControls.length} Controls
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
