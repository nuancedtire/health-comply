import { createFileRoute } from "@tanstack/react-router";
import { useLoaderData } from "@tanstack/react-router";
import { listEvidenceFn } from "@/core/functions/evidence";
import { getEvidenceCategoriesFn, getQualityStatementsFn } from "@/core/functions/framework";
import { EvidenceCard } from "@/components/app/evidence-card";
import { EvidenceUploadModal } from "@/components/app/evidence-upload-modal";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_app/evidence/")({
    loader: async () => {
        const [items, categories, statements] = await Promise.all([
            listEvidenceFn(),
            getEvidenceCategoriesFn(),
            getQualityStatementsFn({ data: {} })
        ]);
        return { items, categories, statements };
    },
    component: EvidencePage,
});

function EvidencePage() {
    const { items, categories } = useLoaderData({ from: "/_app/evidence/" });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Evidence Locker</h1>
                    <p className="text-muted-foreground">
                        Manage and tag your compliance evidence.
                    </p>
                </div>
                <EvidenceUploadModal categories={categories} />
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search evidence..."
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item: any) => (
                    <EvidenceCard key={item.id} item={item} />
                ))}
                {items.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                        <p>No evidence found.</p>
                        <p className="text-sm">Upload evidence to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
