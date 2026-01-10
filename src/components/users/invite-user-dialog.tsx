import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getRolesFn, getSitesFn, getTenantsFn, inviteUserFn } from "@/core/functions/admin-functions"
import { getCurrentUserRoleFn } from "@/core/functions/auth-functions"
import { authClient } from "@/lib/auth-client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2, Mail } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const inviteUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    tenantId: z.string().min(1, "Tenant is required"),
    role: z.string().min(1, "Role is required"),
    siteId: z.string().optional(),
});

export function InviteUserDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const { data: session } = authClient.useSession();
    const isSystemAdmin = (session?.user as any)?.isSystemAdmin;

    // Fetch My Role directly to ensure we have up-to-date scoping info
    const { data: myRoleData } = useQuery({
        queryKey: ['my-role', session?.user?.id],
        queryFn: () => getCurrentUserRoleFn(),
        enabled: !!session?.user
    });

    const form = useForm<z.infer<typeof inviteUserSchema>>({
        resolver: zodResolver(inviteUserSchema),
        defaultValues: {
            email: '',
            tenantId: '',
            role: '',
            siteId: 'default',
        }
    })

    const selectedTenantId = form.watch('tenantId');
    const selectedRole = form.watch('role');

    // Effect: Set initial Tenant/Site if scoped
    // We utilize useEffect or just derived logic? 
    // Effect is safer to trigger form updates once data is ready.
    // However, react-hook-form values are controlled.

    // Simple approach: When opening dialog or data loads, set defaults.
    // Better: Allow manual or auto selection. 
    // If not system admin, we force tenantId.
    if (!isSystemAdmin && myRoleData && !form.getValues('tenantId')) {
        // We can't access context user object here easily to get tenantId without passing it or relying on query.
        // But wait, `data: session` has tenantId usually? 
        // Let's assume authClient session object has it or we rely on myRoleData (which has logic issues if we didn't return tenantId).
        // Modify auth-functions.ts to return tenantId? 
        // Actually, `getCurrentUserRoleFn` returns type and siteId, but not tenantId.
        // Session usually has it.
        const userTenantId = (session?.user as any)?.tenantId;
        if (userTenantId) {
            form.setValue('tenantId', userTenantId);
        }
    }

    // Fetch Tenants (Only if System Admin)
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: () => getTenantsFn(),
        enabled: !!isSystemAdmin
    });

    // Fetch Roles
    const { data: roles } = useQuery({
        queryKey: ['roles'], // Static, no dependency
        queryFn: () => getRolesFn({ data: {} }), // No params needed
        enabled: true
    });

    // Fetch Sites
    const { data: sites } = useQuery({
        queryKey: ['sites', selectedTenantId],
        queryFn: () => getSitesFn({ data: { tenantId: selectedTenantId } }),
        enabled: !!selectedTenantId
    });


    // Actually, getSitesFn is protected. 
    // If I'm a Manager (site-scoped), I should only see my site.
    // But `getSitesFn` for non-admin currently returns ALL sites of the tenant?
    // Let's check `getSitesFn`. It takes `tenantId`.
    // We should probably filter `getSitesFn` output or filtered locally if the user is site-scoped.

    const filteredSites = myRoleData?.type === 'site' && myRoleData?.siteId
        ? sites?.filter((s: any) => s.id === myRoleData.siteId)
        : sites;

    const selectedRoleName = selectedRole;
    const isPracticeManager = selectedRole === 'Practice Manager';
    const isTenantAdmin = selectedRole === 'Admin';

    const isSiteRequired = !isPracticeManager && !isTenantAdmin && !!selectedRole;

    const mutation = useMutation({
        mutationFn: inviteUserFn,
        onSuccess: (result) => {
            const link = `${window.location.origin}/signup?token=${result.token}`;
            toast.success("Invitation created!", {
                description: "Link copied to clipboard",
            });
            navigator.clipboard.writeText(link);
            form.reset();
            // Re-apply defaults if needed
            if (!isSystemAdmin && (session?.user as any)?.tenantId) {
                form.setValue('tenantId', (session?.user as any).tenantId);
            }
            setOpen(false);
            onSuccess();
        },
        onError: (error) => {
            toast.error(`Error: ${error.message}`)
        }
    })

    const onSubmit = (values: z.infer<typeof inviteUserSchema>) => {
        if (isSiteRequired && (!values.siteId || values.siteId === 'default')) {
            form.setError('siteId', { message: "Site is required for this role" });
            return;
        }

        mutation.mutate({
            data: {
                ...values,
                siteId: values.siteId === 'default' ? undefined : values.siteId
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Mail className="mr-2 h-4 w-4" />
                    Invite User
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                        Send an invitation to join. They will receive an email with a signup link.
                    </DialogDescription>
                </DialogHeader>

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

                    {isSystemAdmin && (
                        <div className="space-y-2">
                            <Label>Tenant</Label>
                            <Controller
                                control={form.control}
                                name="tenantId"
                                render={({ field }) => (
                                    <Select onValueChange={(val) => {
                                        field.onChange(val);
                                        form.setValue('role', '');
                                        form.setValue('siteId', 'default');
                                    }} value={field.value}>
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
                    )}

                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Controller
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedTenantId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={selectedTenantId ? "Select a role" : "Select a tenant first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles?.map((r: any) => (
                                            <SelectItem key={r.id} value={r.name}>
                                                {r.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {form.formState.errors.role && (
                            <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Site {isSiteRequired && <span className="text-red-500">*</span>}</Label>
                        <Controller
                            control={form.control}
                            name="siteId"
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={!selectedTenantId || !filteredSites || filteredSites.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !selectedTenantId ? "Select a tenant first" :
                                                (filteredSites?.length === 0 ? "No sites available" :
                                                    (isSiteRequired ? "Select a site" : "Optional (Tenant Level)"))
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {!isSiteRequired && (
                                            <SelectItem value="default">None (Tenant Level)</SelectItem>
                                        )}
                                        {filteredSites?.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {isSiteRequired && (!filteredSites || filteredSites.length === 0) && selectedTenantId && (
                            <p className="text-sm text-amber-600">
                                This role requires a site, but no sites exist for this tenant.
                                <br />Please create a site first.
                            </p>
                        )}
                        {form.formState.errors.siteId && (
                            <p className="text-sm text-red-500">{form.formState.errors.siteId.message}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={mutation.isPending || (isSiteRequired && (!filteredSites || filteredSites.length === 0))}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Link
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
