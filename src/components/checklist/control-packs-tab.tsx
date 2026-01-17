import { useQuery } from "@tanstack/react-query";
import { getControlPacksFn, getImportedPacksFn } from "@/core/functions/control-pack-functions";
import { ControlPackCard } from "./control-pack-card";
import { ControlPackPreview } from "./control-pack-preview";
import { useSite } from "@/components/site-context";
import { Loader2, PackageOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const KEY_QUESTION_STYLES: Record<string, { bg: string, text: string, border: string }> = {
    'safe': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'effective': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'caring': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'responsive': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'well_led': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

export function ControlPacksTab() {
    const { activeSite } = useSite();
    const [previewPackId, setPreviewPackId] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const { data: packsData, isLoading: isPacksLoading } = useQuery({
        queryKey: ["control-packs"],
        queryFn: () => getControlPacksFn(),
    });

    const { data: importedData, isLoading: isImportedLoading } = useQuery({
        queryKey: ["imported-packs", activeSite?.id],
        queryFn: () => getImportedPacksFn({ data: { siteId: activeSite?.id } }),
        enabled: !!activeSite?.id
    });

    const isLoading = isPacksLoading || isImportedLoading;

    const handlePreview = (packId: string) => {
        setPreviewPackId(packId);
        setIsPreviewOpen(true);
    };

    const isPackImported = (packId: string) => {
        return importedData?.importedPacks.some(p => p.packId === packId) || false;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin" />
                <p>Loading control packs library...</p>
            </div>
        );
    }

    if (!packsData?.groups.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-4 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                <PackageOpen className="h-12 w-12 opacity-50" />
                <p>No control packs available at the moment.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight">Browse Control Packs</h3>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Import pre-built sets of compliance controls designed for specific CQC Key Questions and service types.
                </p>
            </div>

            <div className="space-y-10">
                {packsData.groups.map((group) => {
                    const styles = KEY_QUESTION_STYLES[group.keyQuestion] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
                    
                    return (
                        <div key={group.keyQuestion} className="space-y-4">
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg border w-fit",
                                styles.bg,
                                styles.border
                            )}>
                                <span className={cn("font-semibold text-sm uppercase tracking-wider", styles.text)}>
                                    {group.label}
                                </span>
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full bg-white/50 border border-black/5", styles.text)}>
                                    {group.packs.length} Packs
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {group.packs.map((pack) => (
                                    <ControlPackCard 
                                        key={pack.packId}
                                        pack={pack}
                                        isImported={isPackImported(pack.packId)}
                                        onPreview={handlePreview}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <ControlPackPreview 
                packId={previewPackId}
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
            />
        </div>
    );
}
