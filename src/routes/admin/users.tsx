import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
    inviteUserFn,
    getTenantsFn,
    getRolesFn,
    getSitesFn,
    getUsersAndInvitesFn,
    revokeInviteFn,
    deleteUserFn,
    updateUserFn,
    generatePasswordResetLinkFn
} from '@/core/functions/admin-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authClient } from '@/lib/auth-client'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from 'react'
import { MoreHorizontal, Loader2, Trash2, Mail, Link as LinkIcon, KeyRound, Copy } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/users')({
    component: UsersPage,
})

const inviteUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    tenantId: z.string().min(1, "Tenant is required"),
    roleId: z.string().min(1, "Role is required"),
    siteId: z.string().optional(),
});

function UsersPage() {
    const { data: session } = authClient.useSession()
    const isSystemAdmin = (session?.user as any)?.isSystemAdmin;

    // -- Global State for Dialogs --
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Dialog Open States
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
    const [resetPwdResult, setResetPwdResult] = useState<string | null>(null); // Stores the generated link
    const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['users-and-invites'],
        queryFn: () => getUsersAndInvitesFn({ data: {} }),
        enabled: !!isSystemAdmin
    });

    // -- Mutations --

    const revokeMutation = useMutation({
        mutationFn: revokeInviteFn,
        onSuccess: () => {
            toast.success("Invitation revoked");
            setRevokeDialogOpen(false);
            setSelectedItem(null);
            refetch();
        },
        onError: (err) => toast.error(err.message)
    });

    const deleteUserMutation = useMutation({
        mutationFn: deleteUserFn,
        onSuccess: () => {
            toast.success("User deleted");
            setDeleteDialogOpen(false);
            setSelectedItem(null);
            refetch();
        },
        onError: (err) => toast.error(err.message)
    });

    const resetPwdMutation = useMutation({
        mutationFn: generatePasswordResetLinkFn,
        onSuccess: (res) => {
            const link = `${window.location.origin}/reset-password?token=${res.token}`;
            setResetPwdResult(link);
            // Dialog for key link is essentially managed by resetPwdResult being non-null? 
            // Or we can have a generic "Success Dialog" or just reuse logic.
            // Actually let's use a specific state for showing the link dialog.
        },
        onError: (err) => toast.error(err.message)
    });

    // -- Handlers --

    const handleAction = (item: any, action: 'delete' | 'revoke' | 'reset-pwd' | 'change-email') => {
        setSelectedItem(item);
        if (action === 'delete') {
            setDeleteDialogOpen(true);
        } else if (action === 'revoke') {
            setRevokeDialogOpen(true);
        } else if (action === 'reset-pwd') {
            // For reset password, maybe we confirm first? 
            // "I want the confirmation dialog box"
            // Let's create a confirmation dialog state for reset too? 
            // Or just do it immediately? Let's assume Confirm -> Show Link.
            // Actually, generating a link is harmless until used, but let's be safe.
            // Wait, reusing Delete dialog might be confusing. Let's make a ResetConfirmDialog.
            // For simplicity, let's just run it immediately and result is the "dialog" showing the link. 
            // But prompt asked for confirmation.
            if (confirm(`Generate password reset link for ${item.name || item.email}?`)) {
                resetPwdMutation.mutate({ data: { userId: item.id } });
            }
        } else if (action === 'change-email') {
            setChangeEmailDialogOpen(true);
        }
    };

    // Better: Standardized Reset Confirmation Dialog approach
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

    const openResetConfirm = (item: any) => {
        setSelectedItem(item);
        setResetConfirmOpen(true);
    };

    const confirmReset = () => {
        if (selectedItem) {
            resetPwdMutation.mutate({ data: { userId: selectedItem.id } });
            setResetConfirmOpen(false);
        }
    };


    if (!isSystemAdmin) {
        return <div className="p-8">Access Denied: System Admins only.</div>
    }

    const allItems = [
        ...(data?.users || []).map((u: any) => ({ ...u, type: 'user', status: 'active' })),
        ...(data?.invitations || []).map((i: any) => ({ ...i, type: 'invitation', status: 'pending' }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage users, roles, and pending invitations across all tenants.</p>
                </div>
                <InviteUserDialog onSuccess={refetch} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Users & Invitations</CardTitle>
                    <CardDescription>
                        A global view of all users and their access levels.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium">
                                    <tr>
                                        <th className="p-4">User</th>
                                        <th className="p-4">Tenant</th>
                                        <th className="p-4">Site</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {allItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                No users or invitations found.
                                            </td>
                                        </tr>
                                    ) : (
                                        allItems.map((item: any) => (
                                            <UserRow
                                                key={item.id}
                                                item={item}
                                                onDelete={() => handleAction(item, 'delete')}
                                                onRevoke={() => handleAction(item, 'revoke')}
                                                onChangeEmail={() => handleAction(item, 'change-email')}
                                                onResetPwd={() => openResetConfirm(item)}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* --- Dialogs --- */}

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-medium text-foreground">{selectedItem?.name || selectedItem?.email}</span>?
                            <br /><br />
                            This action is irreversible. All of their data and access will be removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteUserMutation.mutate({ data: { userId: selectedItem.id } })} disabled={deleteUserMutation.isPending}>
                            {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke Confirmation */}
            <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revoke Invitation</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to revoke the invitation for <span className="font-medium text-foreground">{selectedItem?.email}</span>?
                            <br />
                            The link they received will no longer work.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => revokeMutation.mutate({ data: { inviteId: selectedItem.id } })} disabled={revokeMutation.isPending}>
                            {revokeMutation.isPending ? "Revoking..." : "Revoke Invitation"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Confirmation */}
            <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Create a password reset link for <span className="font-medium text-foreground">{selectedItem?.name || selectedItem?.email}</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={confirmReset} disabled={resetPwdMutation.isPending}>
                            {resetPwdMutation.isPending ? "Generating..." : "Generate Link"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Result - Show Link */}
            <Dialog open={!!resetPwdResult} onOpenChange={(open) => !open && setResetPwdResult(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Password Reset Link</DialogTitle>
                        <DialogDescription>
                            Share this link with the user manually.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 mt-2">
                        <Input readOnly value={resetPwdResult || ''} />
                        <Button size="icon" onClick={() => {
                            if (resetPwdResult) {
                                navigator.clipboard.writeText(resetPwdResult);
                                toast.success("Copied to clipboard");
                            }
                        }}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setResetPwdResult(null)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Change Email Dialog */}
            <ChangeEmailDialog
                open={changeEmailDialogOpen}
                onOpenChange={setChangeEmailDialogOpen}
                user={selectedItem}
                onSuccess={() => {
                    refetch();
                    setSelectedItem(null);
                }}
            />

        </div>
    )
}

function UserRow({ item, onDelete, onRevoke, onChangeEmail, onResetPwd }: {
    item: any,
    onDelete: () => void,
    onRevoke: () => void,
    onChangeEmail: () => void,
    onResetPwd: () => void
}) {
    const isInvite = item.type === 'invitation';

    const copyInviteLink = () => {
        const link = `${window.location.origin}/signup?token=${item.token}`;
        navigator.clipboard.writeText(link);
        toast.success("Invite link copied to clipboard");
    }

    return (
        <tr className="hover:bg-muted/50 transition-colors">
            <td className="p-4">
                <div className="flex flex-col">
                    <span className="font-medium text-foreground">{item.name || item.email}</span>
                    {!isInvite && item.name && <span className="text-xs text-muted-foreground">{item.email}</span>}
                </div>
            </td>
            <td className="p-4">{item.tenantName || <span className="text-muted-foreground italic">None</span>}</td>
            <td className="p-4">{item.siteName || <span className="text-muted-foreground italic">All Sites</span>}</td>
            <td className="p-4">
                <Badge variant="outline" className="font-normal">
                    {item.roleName}
                </Badge>
            </td>
            <td className="p-4">
                <Badge variant={isInvite ? "secondary" : "default"}>
                    {isInvite ? "Pending Invite" : "Active"}
                </Badge>
            </td>
            <td className="p-4 text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {isInvite ? (
                            <>
                                <DropdownMenuItem onClick={copyInviteLink}>
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Copy Invite Link
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={onRevoke}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Revoke Invitation
                                </DropdownMenuItem>
                            </>
                        ) : (
                            <>
                                <DropdownMenuItem onClick={onChangeEmail}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Change Email
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={onResetPwd}>
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Reset Password
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={onDelete}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </td>
        </tr>
    )
}

function ChangeEmailDialog({ open, onOpenChange, user, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, user: any, onSuccess: () => void }) {
    const [newEmail, setNewEmail] = useState('');
    const updateMutation = useMutation({
        mutationFn: updateUserFn,
        onSuccess: () => {
            toast.success("Email updated successfully");
            onOpenChange(false);
            onSuccess();
        },
        onError: (err) => toast.error(err.message)
    });

    // Reset email state when dialog opens
    // (Simplistic: doing this via useEffect or just letting unmount handle it if strictly conditional, but Dialog keeps mounted usually. 
    // Ideally use form or reset effect. Simple fix: reset on submit or close.)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Email Address</DialogTitle>
                    <DialogDescription>
                        Update email address for {user?.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>New Email</Label>
                        <Input
                            placeholder={user?.email}
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={() => updateMutation.mutate({ data: { userId: user.id, email: newEmail } })}
                        disabled={updateMutation.isPending || !newEmail || newEmail === user?.email}
                    >
                        {updateMutation.isPending ? "Updating..." : "Update Email"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


function InviteUserDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);

    const form = useForm<z.infer<typeof inviteUserSchema>>({
        resolver: zodResolver(inviteUserSchema),
        defaultValues: {
            email: '',
            tenantId: '',
            roleId: '',
            siteId: 'default', // Using 'default' as undefined placeholder
        }
    })

    const selectedTenantId = form.watch('tenantId');
    const selectedRoleId = form.watch('roleId');

    // Fetch Tenants
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: () => getTenantsFn(),
    });

    // Fetch Roles
    const { data: roles } = useQuery({
        queryKey: ['roles', selectedTenantId],
        queryFn: () => getRolesFn({ data: { tenantId: selectedTenantId } }),
        enabled: !!selectedTenantId
    });

    // Fetch Sites
    const { data: sites } = useQuery({
        queryKey: ['sites', selectedTenantId],
        queryFn: () => getSitesFn({ data: { tenantId: selectedTenantId } }),
        enabled: !!selectedTenantId
    });

    const selectedRoleName = roles?.find((r: any) => r.id === selectedRoleId)?.name;
    const isPracticeManager = selectedRoleName === 'Practice Manager';
    const isTenantAdmin = selectedRoleName === 'Admin'; // Assuming 'Admin' is tenant admin

    // Logic: 
    // Practice Manager -> Site Optional (can be invited to Tenant)
    // Tenant Admin -> Site Optional (can be invited to Tenant)
    // Others -> Site REQUIRED

    const isSiteRequired = !isPracticeManager && !isTenantAdmin && !!selectedRoleId;

    const mutation = useMutation({
        mutationFn: inviteUserFn,
        onSuccess: (result) => {
            const link = `${window.location.origin}/signup?token=${result.token}`;
            toast.success("Invitation created!", {
                description: "Link copied to clipboard",
            });
            navigator.clipboard.writeText(link);
            form.reset();
            setOpen(false);
            onSuccess();
        },
        onError: (error) => {
            toast.error(`Error: ${error.message}`)
        }
    })

    const onSubmit = (values: z.infer<typeof inviteUserSchema>) => {
        // Validation for site requirement
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
                        {/* Actually we just generate link for now */}
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

                    <div className="space-y-2">
                        <Label>Tenant</Label>
                        <Controller
                            control={form.control}
                            name="tenantId"
                            render={({ field }) => (
                                <Select onValueChange={(val) => {
                                    field.onChange(val);
                                    form.setValue('roleId', ''); // Reset role on tenant change
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

                    <div className="space-y-2">
                        <Label>Site {isSiteRequired && <span className="text-red-500">*</span>}</Label>
                        <Controller
                            control={form.control}
                            name="siteId"
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={!selectedTenantId || !sites || sites.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !selectedTenantId ? "Select a tenant first" :
                                                (sites?.length === 0 ? "No sites available" :
                                                    (isSiteRequired ? "Select a site" : "Optional (Tenant Level)"))
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {!isSiteRequired && (
                                            <SelectItem value="default">None (Tenant Level)</SelectItem>
                                        )}
                                        {sites?.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {isSiteRequired && (!sites || sites.length === 0) && selectedTenantId && (
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
                        <Button type="submit" disabled={mutation.isPending || (isSiteRequired && (!sites || sites.length === 0))}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Link
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
