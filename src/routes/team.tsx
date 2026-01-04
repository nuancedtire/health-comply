import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'

export const Route = createFileRoute('/team')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: TeamPage,
})

function TeamPage() {
    return (
        <MainLayout title="Teams & Tasks">
            <div className="flex flex-col gap-4">
                <div className="bg-muted/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Teams & Tasks</h2>
                    <p className="text-muted-foreground">Manage team members and assign compliance tasks.</p>
                </div>
            </div>
        </MainLayout>
    )
}
