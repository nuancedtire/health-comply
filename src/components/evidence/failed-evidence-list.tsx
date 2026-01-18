import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEvidenceFn } from "@/core/functions/evidence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { AlertTriangle, Trash2, FileX, Info } from "lucide-react";
import { format } from "date-fns";

interface FailedEvidenceItem {
    id: string;
    title: string;
    uploadedAt: Date | string;
    classificationResult?: {
        type: string;
        error?: string;
        failedAt?: string;
    };
    mimeType: string;
    sizeBytes: number;
}

interface FailedEvidenceListProps {
    evidence: FailedEvidenceItem[];
}

export function FailedEvidenceList({ evidence }: FailedEvidenceListProps) {
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async (evidenceId: string) => {
            await deleteEvidenceFn({ data: { evidenceId } });
        },
        onSuccess: () => {
            toast.success("Failed upload removed");
            queryClient.invalidateQueries({ queryKey: ["evidence"] });
            setDeleteId(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete");
        },
    });

    if (evidence.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Failed Uploads</h3>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    {evidence.length}
                </Badge>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                    <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                        <p className="font-medium">These uploads failed during AI processing</p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                            You can delete them and try uploading again, or contact support if the issue persists.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {evidence.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-md border border-amber-200 dark:border-amber-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded">
                                    <FileX className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Uploaded {format(new Date(item.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                                        {item.classificationResult?.error && (
                                            <span className="ml-2 text-red-500">
                                                Error: {item.classificationResult.error.substring(0, 50)}
                                                {item.classificationResult.error.length > 50 && "..."}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setDeleteId(item.id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Failed Upload</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this failed upload. You can upload the file again afterward.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
