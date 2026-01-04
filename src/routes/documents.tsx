import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'

export const Route = createFileRoute('/documents')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: DocumentsPage,
})

function DocumentsPage() {
    return (
        <MainLayout title="Documents">
            <div className="flex flex-col gap-4">
                <div className="bg-muted/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Evidence & Documents</h2>
                    <p className="text-muted-foreground">Manage your compliance evidence and documents here.</p>
                </div>
            </div>
        </MainLayout>
    )
}
