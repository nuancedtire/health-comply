import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'

export const Route = createFileRoute('/settings')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: SettingsPage,
})

function SettingsPage() {
    return (
        <MainLayout title="Settings">
            <div className="flex flex-col gap-4">
                <div className="bg-muted/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Workspace Settings</h2>
                    <p className="text-muted-foreground">Configure your workspace, compliance preferences, and organization details.</p>
                </div>
            </div>
        </MainLayout>
    )
}
