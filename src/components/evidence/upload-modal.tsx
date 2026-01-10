import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useCallback } from "react";
import * as React from "react";
import { uploadEvidenceFn } from "@/core/functions/upload";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EvidenceUploadModalProps {
    siteId: string;
    initialQsId?: string;
    initialControlId?: string;
    trigger?: React.ReactNode; // Allow custom trigger button
    onSuccess?: (data?: any) => void;
}

export function UploadModal({ siteId, initialQsId, initialControlId, trigger, onSuccess }: EvidenceUploadModalProps) {
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();

    const handleFiles = (newFiles: FileList | File[]) => {
        const validFiles: File[] = [];
        const fileArray = Array.from(newFiles);

        fileArray.forEach(file => {
            // Validate size (e.g. 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
            } else {
                validFiles.push(file);
            }
        });

        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [])

    const handleUpload = async () => {
        if (files.length === 0) return;
        if (!siteId) {
            toast.error("Site ID is missing");
            return;
        }

        setIsUploading(true);
        let successCount = 0;
        let failCount = 0;

        try {
            // Process uploads sequentially or concurrently. 
            // Concurrent is usually better but let's do simple Promise.all
            const uploadPromises = files.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("siteId", siteId);
                if (initialQsId) formData.append("qsId", initialQsId);
                if (initialControlId) formData.append("localControlId", initialControlId);

                try {
                    await uploadEvidenceFn({ data: formData });
                    return { success: true, fileName: file.name };
                } catch (error: any) {
                    console.error(`Failed to upload ${file.name}`, error);
                    return { success: false, fileName: file.name, error: error.message };
                }
            });

            const results = await Promise.all(uploadPromises);

            successCount = results.filter(r => r.success).length;
            failCount = results.length - successCount;

            if (successCount > 0) {
                toast.success(`Successfully uploaded ${successCount} file(s)`);
                queryClient.invalidateQueries({ queryKey: ["evidence"] });
                queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
                onSuccess?.(results);
            }

            if (failCount > 0) {
                toast.error(`Failed to upload ${failCount} file(s)`);
            }

            // If all succeeded, close modal and clear files
            if (failCount === 0) {
                setOpen(false);
                setFiles([]);
            } else {
                // Keep the modal open and maybe remove successful files? 
                // For now, let's just keep all files so user can retry or remove failed ones
                // Actually, better UX: Remove successful ones from list
                const failedFilesNames = new Set(results.filter(r => !r.success).map(r => r.fileName));
                setFiles(prev => prev.filter(f => failedFilesNames.has(f.name)));
            }

        } catch (error: any) {
            // Should not happen due to individual try/catch inside map
            toast.error(error.message || "Upload process failed");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="gap-2">
                        <FileUp className="w-4 h-4" />
                        Upload Evidence
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Evidence</DialogTitle>
                    <DialogDescription>
                        Add documents to your evidence locker. We'll extract text and meaningful insights automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Drop Zone */}
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden",
                            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                            files.length > 0 ? "border-solid border-primary/20 bg-primary/5" : ""
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            id="file-upload"
                            type="file"
                            className="hidden"
                            multiple
                            onChange={(e) => e.target.files && handleFiles(e.target.files)}
                            accept="application/pdf,.pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.txt"
                        />

                        {files.length > 0 ? (
                            <div className="w-full h-full p-2 overflow-y-auto space-y-2">
                                {files.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-2 bg-background/80 backdrop-blur-sm rounded-md shadow-sm border animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-2 bg-muted rounded-full shrink-0">
                                            <FileText className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive shrink-0"
                                            onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="text-center pt-2">
                                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                                        + Add more files
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 p-4 text-center pointer-events-none">
                                <div className="p-3 bg-muted rounded-full">
                                    <FileUp className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">PDF, Office Docs & Sheets, Images (max 10MB)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md flex gap-2 items-start text-xs text-blue-700 dark:text-blue-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            We support PDF, Word, Excel, Text, and Images. Large files may take a moment to process.
                            Please ensure no sensitive patient data is visible in screenshots.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                        {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isUploading ? "Uploading..." : `Upload ${files.length > 1 ? `${files.length} Files` : "File"}`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
