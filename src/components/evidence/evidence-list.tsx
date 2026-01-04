import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";

type EvidenceItem = {
    id: string;
    title: string;
    qsId: string;
    evidenceCategoryId: string;
    status: string;
    uploadedAt: Date;
    sizeBytes: number;
    mimeType: string;
    summary?: string | null;
    aiConfidence?: number | null;
};

export function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
        }).format(new Date(date));
    };

    if (evidence.length === 0) {
        return (
            <div className="text-center p-8 border rounded-lg bg-muted/10">
                <p className="text-muted-foreground">No evidence uploaded yet.</p>
            </div>
        );
    }

    return (
        <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                    <tr className="text-left">
                        <th className="h-12 px-4 font-medium text-muted-foreground">Title & AI Analysis</th>
                        <th className="h-12 px-4 font-medium text-muted-foreground">Quality Statement</th>
                        <th className="h-12 px-4 font-medium text-muted-foreground">Category</th>
                        <th className="h-12 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="h-12 px-4 font-medium text-muted-foreground">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {evidence.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="p-4 font-medium">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <span>{item.title}</span>
                                    </div>
                                    {item.summary && (
                                        <div className="ml-6 text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                                            <span className="font-semibold text-primary/80">AI Insight:</span> {item.summary}
                                            {item.aiConfidence ? <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">{(item.aiConfidence)}% match</span> : null}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="p-4 align-top">{item.qsId}</td>
                            <td className="p-4 capitalize align-top">{item.evidenceCategoryId.replace('_', ' ')}</td>
                            <td className="p-4 align-top">
                                {item.status === 'processing' && <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Processing</Badge>}
                                {item.status === 'draft' && <Badge variant="outline">Draft</Badge>}
                                {item.status === 'approved' && <Badge className="bg-green-500">Approved</Badge>}
                            </td>
                            <td className="p-4 text-muted-foreground align-top">
                                {formatDate(item.uploadedAt)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
