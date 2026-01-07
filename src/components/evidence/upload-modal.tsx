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
    onSuccess?: () => void;
}

export function UploadModal({ siteId, initialQsId, initialControlId, trigger, onSuccess }: EvidenceUploadModalProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();

    const handleFile = (newFile: File) => {
        // Validate size (e.g. 10MB)
        if (newFile.size > 10 * 1024 * 1024) {
            toast.error("File is too large. Maximum size is 10MB.");
            return;
        }

        setFile(newFile);
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [])

    const handleUpload = async () => {
        if (!file) return;
        if (!siteId) {
            toast.error("Site ID is missing");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("siteId", siteId);
        if (initialQsId) formData.append("qsId", initialQsId);
        if (initialControlId) formData.append("localControlId", initialControlId);

        try {
            await uploadEvidenceFn({ data: formData });
            toast.success("File uploaded successfully");
            setOpen(false);
            setFile(null);
            queryClient.invalidateQueries({ queryKey: ["evidence"] });
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "Upload failed");
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
                        Add a document to your evidence locker. We'll extract text and meaningful insights automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Drop Zone */}
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        className={cn(
                            "relative flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer",
                            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                            file ? "border-solid border-primary/20 bg-primary/5" : ""
                        )}
                        onClick={() => !file && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            accept="application/pdf,.pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        />

                        {file ? (
                            <div className="flex flex-col items-center gap-2 p-4 text-center animate-in fade-in zoom-in-95">
                                <div className="p-3 bg-background rounded-full shadow-sm ring-1 ring-border">
                                    <FileText className="w-8 h-8 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 p-4 text-center">
                                <div className="p-3 bg-muted rounded-full">
                                    <FileUp className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG, XLSX (max 10MB)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md flex gap-2 items-start text-xs text-blue-700 dark:text-blue-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                            We support PDF, Word documents, and images. Large files may take a moment to process.
                            Please ensure no sensitive patient data is visible in screenshots.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isUploading ? "Uploading..." : "Upload File"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
