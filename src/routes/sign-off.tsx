import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'

export const Route = createFileRoute('/sign-off')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: SignOffPage,
})

function SignOffPage() {
    return (
        <MainLayout title="Expert Sign-Off">
            <div className="flex flex-col gap-4">
                <div className="bg-muted/50 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Expert Sign-Off</h2>
                    <p className="text-muted-foreground">Review and approve compliance items.</p>
                </div>
            </div>
        </MainLayout>
    )
}
