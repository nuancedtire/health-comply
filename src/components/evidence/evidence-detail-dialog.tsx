
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateEvidenceFn, deleteEvidenceFn, getEvidenceReferenceDataFn } from "@/core/functions/evidence";
import { getLocalControlsFn } from "@/core/functions/local-control-functions";
import { Loader2, Trash2, Download, FileText, Calendar, Database, Eye, FileImage, Table as TableIcon, AlertTriangle as AlertIcon } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from "sonner";

interface EvidenceDetailDialogProps {
    evidence: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EvidenceDetailDialog({ evidence, open, onOpenChange }: EvidenceDetailDialogProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(evidence?.title || "");
    const [status, setStatus] = useState(evidence?.status || "pending_review");
    const [summary, setSummary] = useState(evidence?.summary || "");
    const [qsId, setQsId] = useState(evidence?.qsId || "");
    const [categoryId, setCategoryId] = useState(evidence?.evidenceCategoryId || "");
    const [localControlId, setLocalControlId] = useState<string>(evidence?.localControlId || "");

    // Fetch Reference Data
    const { data: refData } = useQuery({
        queryKey: ["evidence-refs"],
        queryFn: () => getEvidenceReferenceDataFn(),
        enabled: open
    });

    // Fetch Local Controls (filtered by QS if selected)
    const { data: controlData } = useQuery({
        queryKey: ["local-controls-ref", qsId, evidence?.siteId],
        queryFn: () => getLocalControlsFn({
            data: {
                qsId: qsId || undefined,
                siteId: evidence?.siteId
            }
        }),
        enabled: open && !!evidence?.siteId
    });

    const updateMutation = useMutation({
        mutationFn: updateEvidenceFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evidence"] });
            queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
            toast.success("Evidence updated");
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error("Failed to update: " + err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEvidenceFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evidence"] });
            queryClient.invalidateQueries({ queryKey: ["checklist-data"] });
            toast.success("Evidence deleted");
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error("Failed to delete: " + err.message);
        }
    });

    const [kqId, setKqId] = useState("");

    // Sync state from evidence and refData
    useEffect(() => {
        if (evidence) {
            setTitle(evidence.title || "");
            setStatus(evidence.status || "pending_review");
            setSummary(evidence.summary || "");
            setQsId(evidence.qsId || "");
            setCategoryId(evidence.evidenceCategoryId || "");
            setLocalControlId(evidence.localControlId || "");
        }
    }, [evidence]);

    // Derive KQ from QS when data loads or QS changes externally
    useEffect(() => {
        if (qsId && refData?.qualityStatements) {
            const qs = refData.qualityStatements.find((q: any) => q.id === qsId);
            if (qs) {
                setKqId(qs.keyQuestionId);
            }
        }
    }, [qsId, refData]);

    const handleSave = (shouldSubmit = false) => {
        let newStatus = status;

        if (shouldSubmit) {
            if (!localControlId || localControlId === "none") {
                toast.error("Please select a Local Control before submitting.");
                return;
            }
            newStatus = "pending_review";
        }

        updateMutation.mutate({
            data: {
                evidenceId: evidence.id,
                updates: {
                    title,
                    status: newStatus,
                    summary,
                    qsId,
                    evidenceCategoryId: categoryId,
                    localControlId: localControlId === "none" ? null : localControlId
                }
            }
        });
    };

    if (!evidence) return null;

    const filteredQs = refData?.qualityStatements.filter((qs: any) => !kqId || qs.keyQuestionId === kqId) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4 space-y-1">
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                {evidence.title}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-4 text-sm">
                                <span>Uploaded {new Date(evidence.uploadedAt).toLocaleDateString()}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{evidence.uploaderName || "Unknown User"}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{(evidence.sizeBytes / 1024).toFixed(1)} KB</span>
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={status === "approved" ? "default" : "secondary"} className="h-7 px-3 text-sm">
                                {status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Download className="w-4 h-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 border-b shrink-0 py-2">
                        <TabsList>
                            <TabsTrigger value="overview">
                                <Eye className="w-4 h-4 mr-2" />
                                Overview & Edit
                            </TabsTrigger>
                            <TabsTrigger value="extracted">
                                <FileText className="w-4 h-4 mr-2" />
                                Extracted Content
                            </TabsTrigger>
                            <TabsTrigger value="metadata">
                                <Database className="w-4 h-4 mr-2" />
                                Raw Metadata
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="overview" className="flex-1 overflow-hidden m-0 p-0 flex flex-col md:flex-row h-full">
                        {/* LEFT: Preview / File Info */}
                        <div className="w-full md:w-1/3 bg-muted/20 border-r p-6 overflow-y-auto">
                            <div className="space-y-6">
                                <div className="aspect-[4/5] bg-background border rounded-lg shadow-sm flex items-center justify-center p-8">
                                    {/* Placeholder for real preview */}
                                    {/* Placeholder for real preview */}
                                    {evidence.mimeType?.startsWith('image/') ? (
                                        <div className="w-full h-full flex items-center justify-center bg-black/5">
                                            {/* Ideally we would use a signed URL here. For now show icon */}
                                            <FileImage className="w-16 h-16 text-muted-foreground/50" />
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
                                                {evidence.mimeType?.includes('csv') || evidence.mimeType?.includes('sheet') ? (
                                                    <TableIcon className="w-10 h-10" />
                                                ) : (
                                                    <FileText className="w-10 h-10" />
                                                )}
                                            </div>
                                            <p className="font-medium text-lg text-foreground/80">
                                                {evidence.mimeType?.split('/')[1]?.toUpperCase() || "DOCUMENT"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {evidence.mimeType?.includes('pdf') ? "Preview in extracted tab" : "Preview not available"}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Timeline
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Created</p>
                                            <p>{new Date(evidence.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Evidence Date</p>
                                            <p>{evidence.evidenceDate ? new Date(evidence.evidenceDate).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Uploaded</p>
                                            <p>{new Date(evidence.uploadedAt).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Valid Until</p>
                                            <p>{evidence.validUntil ? new Date(evidence.validUntil).toLocaleDateString() : 'Forever'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Edit Form */}
                        <div className="w-full md:w-2/3 p-8 overflow-y-auto flex-1">
                            {status === 'draft' && (
                                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-md p-4 flex gap-3 text-amber-900">
                                    <AlertIcon className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-sm">Action Required: Verify Match</h4>
                                        <p className="text-sm text-amber-800">
                                            This evidence is in <strong>Draft</strong>. Please verify it is matched to the correct Local Control below, then click "Submit".
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-8 max-w-4xl">
                                <div className="col-span-2 space-y-2">
                                    <Label>Title</Label>
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="pending_review">Pending Review</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {refData?.categories.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Key Question</Label>
                                    <Select value={kqId} onValueChange={(val) => {
                                        setKqId(val);
                                        setQsId("");
                                        setLocalControlId("none");
                                    }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select KQ..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {refData?.keyQuestions?.map((kq: any) => (
                                                <SelectItem key={kq.id} value={kq.id}>
                                                    {kq.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Quality Statement</Label>
                                    <Select value={qsId} onValueChange={(val) => {
                                        setQsId(val);
                                        setLocalControlId("none");
                                    }} disabled={!kqId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select QS..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredQs.map((qs: any) => (
                                                <SelectItem key={qs.id} value={qs.id}>
                                                    {qs.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label>Attached Local Control</Label>
                                    <Select value={localControlId} onValueChange={setLocalControlId} disabled={!qsId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={qsId ? "Select Control..." : "Select QS first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- Detach Control --</SelectItem>
                                            {controlData?.controls.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label className="flex justify-between items-center">
                                        AI Summary / Analysis
                                        {evidence.aiConfidence && (
                                            <Badge variant="outline" className="text-xs font-normal">
                                                Confidence: {evidence.aiConfidence}%
                                            </Badge>
                                        )}
                                    </Label>
                                    <Textarea
                                        value={summary}
                                        onChange={(e) => setSummary(e.target.value)}
                                        className="min-h-[150px] font-mono text-sm leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="extracted" className="flex-1 overflow-y-auto p-8 m-0 h-full">
                        {evidence.textContent ? (
                            <div className="max-w-4xl mx-auto space-y-4">
                                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 rounded-lg">
                                    <p className="text-sm font-medium">Text content was extracted automatically from the file.</p>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none p-6 border rounded-lg bg-background shadow-xs overflow-auto">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                                            li: ({ node, ...props }) => <li className="my-1" {...props} />,
                                            table: ({ node, ...props }) => <table className="w-full border-collapse border my-4" {...props} />,
                                            th: ({ node, ...props }) => <th className="border px-4 py-2 bg-muted font-semibold" {...props} />,
                                            td: ({ node, ...props }) => <td className="border px-4 py-2" {...props} />,
                                        }}
                                    >
                                        {evidence.textContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <FileText className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">No extracted text available</p>
                                <p className="text-sm">This file may be an image without text or hasn't been processed yet.</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="metadata" className="flex-1 overflow-y-auto p-8 m-0 h-full">
                        <div className="max-w-3xl mx-auto border rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 font-medium text-muted-foreground w-1/3">Property</th>
                                        <th className="px-6 py-3 font-medium text-muted-foreground">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Object.entries(evidence).map(([key, value]) => {
                                        if (key === 'textContent' || key === 'localControl' || key === 'qs') return null; // Skip large objects
                                        return (
                                            <tr key={key} className="hover:bg-muted/10">
                                                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{key}</td>
                                                <td className="px-6 py-3 font-mono text-xs truncate max-w-xs" title={String(value)}>
                                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between sm:justify-between w-full shrink-0">
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (confirm("Are you sure? This cannot be undone.")) {
                                deleteMutation.mutate({ data: { evidenceId: evidence.id } });
                            }
                        }}
                        disabled={deleteMutation.isPending}
                    >
                        {deleteMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Evidence
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        {status === 'draft' ? (
                            <Button
                                onClick={() => handleSave(true)}
                                disabled={updateMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {updateMutation.isPending && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                Submit Evidence
                            </Button>
                        ) : (
                            <Button
                                onClick={() => handleSave(false)}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
                                Save Changes
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
