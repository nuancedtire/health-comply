import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, Loader2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type EvidenceItem = {
    id: string;
    siteId: string;
    title: string;
    qsId: string;
    evidenceCategoryId: string | null;
    status: string;
    uploadedAt: Date;
    evidenceDate?: Date | null;
    sizeBytes: number;
    mimeType: string;
    summary?: string | null;
    aiConfidence?: number | null;
    localControlId?: string | null;
    localControl?: {
        title: string;
    } | null;
    qs?: {
        title: string;
        keyQuestion?: {
            title: string;
        } | null;
    } | null;
};

export function EvidenceList({ evidence, onSelect }: { evidence: EvidenceItem[], onSelect: (item: EvidenceItem) => void }) {
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        }).format(new Date(date));
    };

    const formatDateRelative = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;

        return formatDate(date);
    };

    if (evidence.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-muted/10">
                <p className="text-muted-foreground">No evidence uploaded yet.</p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%]">Title & AI Analysis</TableHead>
                            <TableHead className="w-[15%]">Local Control</TableHead>
                            <TableHead className="w-[20%]">Quality Statement</TableHead>
                            <TableHead className="w-[10%]">Category</TableHead>
                            <TableHead className="w-[10%]">Status</TableHead>
                            <TableHead className="w-[15%]">Dates</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {evidence.map((item) => (
                            <TableRow
                                key={item.id}
                                className={cn("transition-colors hover:bg-muted/50",
                                    item.status === 'processing' ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                                )}
                                onClick={() => {
                                    if (item.status === 'processing') return;
                                    onSelect(item);
                                }}
                            >
                                <TableCell className="align-top">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            <span className="truncate max-w-[200px]" title={item.title}>{item.title}</span>
                                        </div>
                                        {item.summary && (
                                            <div className="mt-1 max-w-[30vw] text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                                                <span className="font-semibold text-primary/80">AI Insight:</span> <span className="text-wrap">{item.summary}</span>
                                                {item.aiConfidence ? <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">{(item.aiConfidence)}% match</span> : null}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="align-top">
                                    {item.localControl ? (
                                        <Badge variant="outline" className="text-xs font-normal truncate max-w-[150px] block">
                                            {item.localControl.title}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 text-[10px]">
                                            AI Matching
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="align-top">
                                    {item.qs ? (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-xs">{item.qs.title}</span>
                                            {item.qs.keyQuestion && (
                                                <Badge variant="outline" className="w-fit text-[10px]">
                                                    KQ: {item.qs.keyQuestion.title}
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">{item.qsId}</span>
                                    )}
                                </TableCell>
                                <TableCell className="capitalize align-top text-xs">
                                    {item.evidenceCategoryId ? (
                                        <Badge variant="secondary" className="text-xs">
                                            {item.evidenceCategoryId.replace('_', ' ')}
                                        </Badge>
                                    ) : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="align-top">
                                    {item.status === 'processing' && <Badge variant="secondary" className="text-[10px]"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing</Badge>}
                                    {item.status === 'draft' && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                                    {item.status === 'approved' && <Badge className="bg-green-500 text-[10px]">Approved</Badge>}
                                    {item.status === 'pending_review' && <Badge className="bg-orange-500 text-[10px]">Review</Badge>}
                                    {item.status === 'rejected' && <Badge variant="destructive" className="text-[10px]">Rejected</Badge>}
                                </TableCell>
                                <TableCell className="text-muted-foreground align-top text-xs whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground">{item.evidenceDate ? formatDate(item.evidenceDate) : "No Date"}</span>
                                        <span className="text-[10px] text-muted-foreground">Up: {formatDateRelative(item.uploadedAt)}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

        </>
    );
}
