import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/debug')({
    component: AdminDebugComponent,
})

function AdminDebugComponent() {
    const { data: session, isPending } = authClient.useSession()

    // TODO: Add server function to fetch all tenants/users if system admin

    if (isPending) {
        return <div className="p-8">Loading session...</div>
    }

    if (!session) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                <p>You must be logged in to view this page.</p>
                <Button asChild className="mt-4">
                    <Link to="/login">Login</Link>
                </Button>
            </div>
        )
    }

    const user = session.user as any // Cast because updated schema might not be fully inferred in client types yet

    return (
        <div className="px-3 space-y-6 py-0">
            <h1 className="text-3xl font-bold">Admin / Debug Console</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Current User Info</CardTitle>
                    <CardDescription>Details about your current session and permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="font-semibold">User ID</p>
                            <p className="font-mono text-sm bg-muted p-1 rounded">{user.id}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Email</p>
                            <p>{user.email}</p>
                        </div>
                        <div>
                            <p className="font-semibold">System Admin</p>
                            <Badge variant={user.isSystemAdmin ? "default" : "secondary"}>
                                {user.isSystemAdmin ? "YES" : "NO"}
                            </Badge>
                        </div>
                        <div>
                            <p className="font-semibold">Tenant ID</p>
                            <p className="font-mono text-sm">{user.tenantId || "None"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {user.isSystemAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>System Management</CardTitle>
                        <CardDescription>Global actions for System Admins</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                        <Button variant="outline">Manage Tenants (Coming Soon)</Button>
                        <Button variant="outline">Global User List (Coming Soon)</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
