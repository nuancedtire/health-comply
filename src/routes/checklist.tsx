import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'

export const Route = createFileRoute('/checklist')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: ChecklistPage,
})

function ChecklistPage() {
    return (
        <MainLayout title="Compliance Checklist">
            <div className="flex flex-col gap-4">
                <div className="bg-muted/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Checklist Overview</h2>
                    <p className="text-muted-foreground">This section will contain the compliance checklist items and progress tracking.</p>
                </div>
            </div>
        </MainLayout>
    )
}
