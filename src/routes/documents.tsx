import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { EvidenceList } from '@/components/evidence/evidence-list'
import { UploadModal } from '@/components/evidence/upload-modal'
import { getEvidenceForSiteFn } from '@/core/functions/evidence'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useSite } from '@/components/site-context'
import { useState } from 'react'
import { EvidenceDetailDialog } from '@/components/evidence/evidence-detail-dialog'

export const Route = createFileRoute('/documents')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    loader: async () => {
        // Prefetch or just rely on component suspense
        // context.queryClient.ensureQueryData(...)
    },
    component: DocumentsPage,
})

function DocumentsPage() {
    // 1. Use the global site context (powered by TeamSwitcher)
    const { activeSite, isLoading: isSiteLoading } = useSite();
    const [selectedEvidence, setSelectedEvidence] = useState<any>(null);

    // 2. Fetch evidence for the active site
    // We only fetch if activeSite is present.
    const { data: evidence, isLoading: isEvidenceLoading } = useSuspenseQuery({
        queryKey: ['evidence', activeSite?.id],
        queryFn: async () => {
            if (!activeSite?.id) return [];
            return await getEvidenceForSiteFn({ data: { siteId: activeSite.id } });
        },
        refetchInterval: (query) => {
            const data = query.state.data as any[];
            if (data?.some(item => item.status === 'processing')) {
                return 2000;
            }
            return false;
        }
    });

    // Auto-open newly uploaded evidence




    if (isSiteLoading) {
        return <MainLayout><div className="p-8">Loading site context...</div></MainLayout>;
    }

    if (!activeSite) {
        return (
            <MainLayout>
                <div className="p-8 text-center text-muted-foreground">
                    Please select a site from the team switcher to view evidence.
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Documents">
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Evidence Library</h2>
                        <p className="text-muted-foreground">
                            Evidence for <span className="font-semibold">{activeSite.name}</span>
                        </p>
                    </div>
                    {/* Pass categories to the modal */}
                    <UploadModal
                        siteId={activeSite.id}
                    />
                </div>

                <div className="rounded-lg bg-card text-card-foreground shadow-sm">
                    {isEvidenceLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading evidence...</div>
                    ) : (
                        <EvidenceList
                            evidence={evidence || []}
                            onSelect={setSelectedEvidence}
                        />
                    )}
                </div>

                <EvidenceDetailDialog
                    open={!!selectedEvidence}
                    onOpenChange={(open) => !open && setSelectedEvidence(null)}
                    evidence={selectedEvidence}
                />
            </div>
        </MainLayout>
    )
}
