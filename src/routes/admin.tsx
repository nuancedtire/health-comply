import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'

export const Route = createFileRoute('/admin')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
        // Enforce System Admin check
        const user = context.user as any
        if (!user.isSystemAdmin) {
            throw redirect({
                to: '/dashboard',
            })
        }
    },
    component: AdminLayout,
})

function AdminLayout() {
    return (
        <MainLayout title="Admin">
            <Outlet />
        </MainLayout>
    )
}
