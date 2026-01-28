
import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { UnifiedControlsHub } from '@/components/checklist/unified-controls-hub'

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

    return (
        <MainLayout title="Compliance Hub">
            <div className="container mx-auto py-6">
                <UnifiedControlsHub
                    initialCreateControl={search.createControl === 'true'}
                    initialTitle={search.title}
                    initialQsId={search.qsId}
                    linkEvidenceId={search.linkEvidenceId}
                />
            </div>
        </MainLayout>
    )
}
