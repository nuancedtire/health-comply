
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { UnifiedControlsHub } from '@/components/checklist/unified-controls-hub'
import { useSite } from '@/components/site-context'
import { Button } from '@/components/ui/button'
import { Building2, ArrowRight } from 'lucide-react'

// Search params for creating controls from the documents page
type ChecklistSearchParams = {
    createControl?: string
    title?: string
    qsId?: string
    linkEvidenceId?: string
}

export const Route = createFileRoute('/checklist')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    validateSearch: (search: Record<string, unknown>): ChecklistSearchParams => {
        return {
            createControl: search.createControl as string | undefined,
            title: search.title as string | undefined,
            qsId: search.qsId as string | undefined,
            linkEvidenceId: search.linkEvidenceId as string | undefined,
        }
    },
    head: () => ({
        meta: [{ title: 'Checklist Hub' }],
    }),
    component: ChecklistPage,
})

function ChecklistPage() {
    const search = Route.useSearch()
    const { sites, isLoading: sitesLoading } = useSite()
    const navigate = useNavigate()

    if (!sitesLoading && sites.length === 0) {
        return (
            <MainLayout title="Compliance Hub">
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <Building2 className="w-10 h-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">No Site Set Up Yet</h2>
                            <p className="text-muted-foreground">
                                You need to create a site before you can manage compliance controls. Sites represent the physical locations your practice manages.
                            </p>
                        </div>
                        <Button size="lg" className="w-full" onClick={() => navigate({ to: '/create-site' })}>
                            Create Your First Site
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout title="Compliance Hub">
            <UnifiedControlsHub
                initialCreateControl={search.createControl === 'true'}
                initialTitle={search.title}
                initialQsId={search.qsId}
                linkEvidenceId={search.linkEvidenceId}
            />
        </MainLayout>
    )
}
