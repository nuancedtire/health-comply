import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell } from 'lucide-react'

export const Route = createFileRoute('/notifications')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: NotificationsPage,
})

function NotificationsPage() {
    return (
        <MainLayout title="Notifications">
            <div className="space-y-6 max-w-4xl mx-auto py-6">
                <Card className="border-dashed">
                    <CardHeader className="text-center pb-8">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-2xl font-semibold">No notifications</CardTitle>
                        <CardDescription className="text-balance">
                            You're all caught up! When you receive notifications about compliance updates or task assignments, they'll appear here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                        <div className="text-sm text-muted-foreground italic">
                            Notification features are coming soon.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
