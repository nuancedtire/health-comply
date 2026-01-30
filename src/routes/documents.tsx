import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { UploadModal } from '@/components/evidence/upload-modal'
import { DocumentsView, EvidenceItem } from '@/components/evidence/documents-view'
import { DocumentsSidebar } from '@/components/evidence/documents-sidebar'
import { getEvidenceForSiteFn, bulkDeleteEvidenceFn } from '@/core/functions/evidence'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSite } from '@/components/site-context'
import { useState, useEffect } from 'react'
import { FileText, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
    },
    head: () => ({
        meta: [{ title: 'Documents' }],
    }),
    component: DocumentsPage,
})

function DocumentsPage() {
    const { activeSite, isLoading: isSiteLoading } = useSite()
    const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null)
    const [sidebarWidth, setSidebarWidth] = useState(420)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const queryClient = useQueryClient()

    // Bulk delete mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: bulkDeleteEvidenceFn,
        onSuccess: (result) => {
            if (result.deletedCount > 0) {
                toast.success(`Deleted ${result.deletedCount} document(s)`)
            }
            if (result.errors && result.errors.length > 0) {
                toast.error(`Failed to delete some documents: ${result.errors.length} error(s)`)
            }
            queryClient.invalidateQueries({ queryKey: ['evidence'] })
            queryClient.invalidateQueries({ queryKey: ['checklist-data'] })
            setSelectedIds(new Set())
            setSelectedEvidence(null)
        },
        onError: (err) => {
            toast.error(`Delete failed: ${err.message}`)
        }
    })

    const handleBulkDelete = (ids: string[]) => {
        if (ids.length === 0) return
        bulkDeleteMutation.mutate({ data: { evidenceIds: ids } })
    }

    // Fetch evidence for the active site
    const { data: evidence, isLoading: isEvidenceLoading } = useSuspenseQuery({
        queryKey: ['evidence', activeSite?.id],
        queryFn: async () => {
            if (!activeSite?.id) return []
            return await getEvidenceForSiteFn({ data: { siteId: activeSite.id } })
        },
        refetchInterval: (query) => {
            const data = query.state.data as EvidenceItem[]
            if (data?.some(item => item.status === 'processing')) {
                return 2000
            }
            return false
        }
    })

    // Clear selection when site changes
    useEffect(() => {
        setSelectedEvidence(null)
    }, [activeSite?.id])

    // Keep selected evidence in sync with updated data
    useEffect(() => {
        if (selectedEvidence && evidence) {
            const updated = evidence.find(e => e.id === selectedEvidence.id)
            if (updated) {
                setSelectedEvidence(updated as EvidenceItem)
            } else {
                setSelectedEvidence(null)
            }
        }
    }, [evidence])

    if (isSiteLoading) {
        return (
            <MainLayout>
                <div className="p-8">Loading site context...</div>
            </MainLayout>
        )
    }

    if (!activeSite) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-30" />
                    <h3 className="font-medium text-foreground text-lg">No Site Selected</h3>
                    <p className="text-sm mt-1 max-w-md">
                        Please select a site from the team switcher to view and manage documents.
                    </p>
                </div>
            </MainLayout>
        )
    }

    const allEvidence = (evidence || []) as EvidenceItem[]
    const hasEvidence = allEvidence.length > 0

    return (
        <MainLayout title="Documents">
            <div className="flex flex-col h-[calc(100vh-8rem)]">
                {/* Header */}
                <div className="flex items-center justify-between px-1 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Evidence Library</h2>
                        <p className="text-muted-foreground text-sm">
                            Manage documents for <span className="font-medium text-foreground">{activeSite.name}</span>
                        </p>
                    </div>
                    <UploadModal siteId={activeSite.id} />
                </div>

                {/* Main Content Area */}
                {!hasEvidence ? (
                    <EmptyState siteId={activeSite.id} />
                ) : (
                    <div className="flex-1 flex rounded-xl border bg-card overflow-hidden">
                        {/* Documents List */}
                        <div className="flex-1 min-w-0">
                            <DocumentsView
                                evidence={allEvidence}
                                selectedId={selectedEvidence?.id || null}
                                onSelect={(item) => setSelectedEvidence(item)}
                                isLoading={isEvidenceLoading}
                                selectedIds={selectedIds}
                                onSelectionChange={setSelectedIds}
                                onBulkDelete={handleBulkDelete}
                                isBulkDeleting={bulkDeleteMutation.isPending}
                            />
                        </div>

                        {/* Details Sidebar */}
                        {selectedEvidence && (
                            <DocumentsSidebar
                                evidence={selectedEvidence}
                                onClose={() => setSelectedEvidence(null)}
                                siteId={activeSite.id}
                                width={sidebarWidth}
                                onWidthChange={setSidebarWidth}
                                minWidth={400}
                                maxWidth={1400}
                            />
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    )
}

function EmptyState({ siteId }: { siteId: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 p-12">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                <FileUp className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No documents yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                Upload your first document to get started. We'll automatically analyze it with AI
                and match it to the appropriate compliance control.
            </p>
            <UploadModal
                siteId={siteId}
                trigger={
                    <Button size="lg" className="gap-2">
                        <FileUp className="h-5 w-5" />
                        Upload Your First Document
                    </Button>
                }
            />
            <div className="mt-8 grid grid-cols-3 gap-6 text-center">
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-primary">1</div>
                    <p className="text-xs text-muted-foreground">Upload document</p>
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-primary">2</div>
                    <p className="text-xs text-muted-foreground">AI analyzes & matches</p>
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold text-primary">3</div>
                    <p className="text-xs text-muted-foreground">Confirm & submit</p>
                </div>
            </div>
        </div>
    )
}
