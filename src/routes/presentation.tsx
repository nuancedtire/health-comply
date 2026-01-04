import { createFileRoute } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/presentation')({
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
        <MainLayout title="CQC Presentation">
            <div className="flex flex-col gap-4">
                <div className="bg-muted/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">CQC Presentation</h2>
                    <p className="text-muted-foreground">View your compliance status in a presentation-ready format.</p>
                </div>
            </div>
        </MainLayout>
    )
}
