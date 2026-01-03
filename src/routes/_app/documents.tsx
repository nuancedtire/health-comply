
// src/routes/_app/documents.tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { authMiddleware } from '@/core/middleware/auth-middleware';
import { evidenceItems } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// --- Server Function ---
export const getEvidenceListFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, session } = context;
        if (!session) throw new Error("Unauthorized");

        return await db.select().from(evidenceItems).orderBy(desc(evidenceItems.createdAt));
    });

// --- Component ---
export const Route = createFileRoute('/_app/documents')({
    component: EvidenceLibrary,
    loader: async () => await getEvidenceListFn(),
});

function EvidenceLibrary() {
    const { data: items, isLoading } = useQuery({
        queryKey: ['evidence-list'],
        queryFn: () => getEvidenceListFn(),
    });

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Evidence Locker</h1>
                    <p className="text-muted-foreground">Manage all your compliance documents.</p>
                </div>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Evidence
                </Button>
            </div>

            <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
                {isLoading ? (
                    <div className="p-8 text-center">Loading compliance evidence...</div>
                ) : items && items.length > 0 ? (
                    <div className="divide-y relative w-full overflow-auto">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-4 p-4 font-medium text-sm text-muted-foreground bg-muted/50">
                            <div className="col-span-5">Title</div>
                            <div className="col-span-3">Status</div>
                            <div className="col-span-3">Date</div>
                            <div className="col-span-1"></div>
                        </div>
                        {items.map((item: typeof evidenceItems.$inferSelect) => (
                            <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/50 transition-colors">
                                <div className="col-span-5 flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded text-blue-600">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium">{item.title}</span>
                                </div>
                                <div className="col-span-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className="col-span-3 text-sm text-muted-foreground">
                                    {new Date(item.uploadedAt * 1000).toLocaleDateString()}
                                </div>
                                <div className="col-span-1 text-right">
                                    <Link to="/evidence/$evidenceId" params={{ evidenceId: item.id }} className="text-sm font-medium text-blue-600 hover:underline">
                                        View
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3">
                            <FileText className="h-12 w-12" />
                        </div>
                        <h3 className="text-lg font-semibold">No evidence found</h3>
                        <p className="text-muted-foreground mt-1 mb-4">Upload your first document to get started.</p>
                        <Button variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Evidence
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
