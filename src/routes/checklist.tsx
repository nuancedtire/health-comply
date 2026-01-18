
import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { UnifiedControlsHub } from '@/components/checklist/unified-controls-hub'

export const Route = createFileRoute('/checklist')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    head: () => ({
        meta: [{ title: 'Checklist Hub' }],
    }),
    component: ChecklistPage,
})

function ChecklistPage() {
    return (
        <MainLayout title="Compliance Hub">
            <div className="container mx-auto py-6">
                <UnifiedControlsHub />
            </div>
        </MainLayout>
    )
}
