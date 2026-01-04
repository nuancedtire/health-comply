import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { inviteUserFn, getTenantsFn, getRolesFn } from '@/core/functions/admin-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/admin/users')({
    component: InviteUserPage,
})

const inviteUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    tenantId: z.string().min(1, "Tenant is required"),
    roleId: z.string().min(1, "Role is required"),
    siteId: z.string().optional(),
})

function InviteUserPage() {
    const { data: session } = authClient.useSession()
    const isSystemAdmin = (session?.user as any)?.isSystemAdmin;

    const form = useForm<z.infer<typeof inviteUserSchema>>({
        resolver: zodResolver(inviteUserSchema),
        defaultValues: {
            email: '',
            tenantId: '',
            roleId: '',
            siteId: 'default',
        }
    })

    const selectedTenantId = form.watch('tenantId');

    // Fetch Tenants
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: () => getTenantsFn(),
        enabled: !!isSystemAdmin
    });

    // Fetch Roles (dependent on selected tenant)
    const { data: roles } = useQuery({
        queryKey: ['roles', selectedTenantId],
        queryFn: () => getRolesFn({ data: { tenantId: selectedTenantId } }),
        enabled: !!selectedTenantId
    });

    const mutation = useMutation({
        mutationFn: inviteUserFn,
        onSuccess: (result) => {
            const link = `${window.location.origin}/signup?token=${result.token}`;
            alert(`Invitation created!\n\nLink: ${link}\n\n(Copied to clipboard)`);
            navigator.clipboard.writeText(link);
            form.reset();
        },
        onError: (error) => {
            alert(`Error: ${error.message}`)
        }
    })

    const onSubmit = (values: z.infer<typeof inviteUserSchema>) => {
        mutation.mutate({
            data: {
                ...values,
                siteId: undefined
            }
        })
    }

    if (!isSystemAdmin) {
        return <div className="p-8">Access Denied: System Admins only.</div>
    }

    return (
        <div className="max-w-md mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Invite User</CardTitle>
                    <CardDescription>
                        Generate a secure invitation link for a new user.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                placeholder="user@example.com"
                                {...form.register('email')}
                            />
                            {form.formState.errors.email && (
                                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Tenant</Label>
                            <Controller
                                control={form.control}
                                name="tenantId"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a tenant" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tenants?.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.tenantId && (
                                <p className="text-sm text-red-500">{form.formState.errors.tenantId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Controller
                                control={form.control}
                                name="roleId"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTenantId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={selectedTenantId ? "Select a role" : "Select a tenant first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles?.map((r: any) => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.roleId && (
                                <p className="text-sm text-red-500">{form.formState.errors.roleId.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={mutation.isPending}>
                            {mutation.isPending ? "Inviting..." : "Generate Invite Link"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
