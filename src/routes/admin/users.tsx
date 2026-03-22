import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
    getUsersAndInvitesFn,
    revokeInviteFn,
    deleteUserFn,
    generatePasswordResetLinkFn
} from '@/core/functions/admin-functions'
import { getEmailConfigurationFn } from '@/core/functions/email-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { authClient } from '@/lib/auth-client'
import { ResendStatusAlert } from '@/components/email/resend-status-alert'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useState, useMemo } from 'react'
import { Loader2, Copy, Search, X, ChevronDown, ChevronRight, User, UserPlus, LayoutList, Rows } from 'lucide-react'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { UserTable } from '@/components/users/user-table'
import { InviteUserDialog } from '@/components/users/invite-user-dialog'
import { ChangeEmailDialog } from '@/components/users/change-email-dialog'

export const Route = createFileRoute('/admin/users')({
    component: UsersPage,
})

function UsersPage() {
    const { data: session } = authClient.useSession()
    const isSystemAdmin = (session?.user as any)?.isSystemAdmin;

    // -- Global State for Dialogs --
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [resetPwdResult, setResetPwdResult] = useState<{
        url: string;
        reason: 'missing-config' | 'send-failed';
    } | null>(null);

    // Dialog Open States
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
    const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);

    // Better: Standardized Reset Confirmation Dialog approach
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['users-and-invites'],
        queryFn: () => getUsersAndInvitesFn({ data: {} }),
        enabled: !!isSystemAdmin
    });
    const { data: emailConfig } = useQuery({
        queryKey: ['email-configuration'],
        queryFn: () => getEmailConfigurationFn(),
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
            if (res.emailDelivery.sent) {
                toast.success("Password reset email sent", {
                    description: `${selectedItem?.email} will receive a reset link shortly.`,
                });
                return;
            }

            if (res.emailDelivery.fallbackUrl) {
                navigator.clipboard.writeText(res.emailDelivery.fallbackUrl);
                setResetPwdResult({
                    url: res.emailDelivery.fallbackUrl,
                    reason: res.emailDelivery.configured ? 'send-failed' : 'missing-config',
                });
                toast(
                    res.emailDelivery.configured
                        ? "Password reset created, but email delivery failed."
                        : "Password reset link generated without automatic email delivery.",
                    {
                        description: "The reset link has been copied so you can share it manually.",
                    }
                );
                return;
            }

            toast.error("Password reset could not be prepared.");
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
            setResetConfirmOpen(true);
        } else if (action === 'change-email') {
            setChangeEmailDialogOpen(true);
        }
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

    // -- Filtering & Sorting State --
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
    const [roleFilter, setRoleFilter] = useState<string[]>([]);
    const [tenantFilter, setTenantFilter] = useState<string[]>([]);
    const [siteFilter, setSiteFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isGroupedByTenant, setIsGroupedByTenant] = useState(true);

    const allItems = useMemo(() => [
        ...(data?.users || []).map((u: any) => ({ ...u, type: 'user', status: 'active' })),
        ...(data?.invitations || []).map((i: any) => ({ ...i, type: 'invitation', status: 'pending' }))
    ], [data]);

    // Derived Filter Options
    const uniqueRoles = useMemo(() => Array.from(new Set(allItems.map(i => i.roleName).filter(Boolean))).sort(), [allItems]);
    const uniqueTenants = useMemo(() => Array.from(new Set(allItems.map(i => i.tenantName).filter(Boolean))).sort(), [allItems]);
    const uniqueSites = useMemo(() => Array.from(new Set(allItems.map(i => i.siteName).filter(Boolean))).sort(), [allItems]);

    const filteredAndSortedItems = useMemo(() => {
        let items = [...allItems];

        // 1. Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const terms = lowerQuery.split(" ").filter(t => t.trim().length > 0);

            items = items.filter(item => {
                return terms.every(term =>
                    (item.name && item.name.toLowerCase().includes(term)) ||
                    (item.email && item.email.toLowerCase().includes(term)) ||
                    (item.tenantName && item.tenantName.toLowerCase().includes(term)) ||
                    (item.siteName && item.siteName.toLowerCase().includes(term)) ||
                    (item.roleName && item.roleName.toLowerCase().includes(term))
                );
            });
        }

        // 2. Filters
        if (roleFilter.length > 0) {
            items = items.filter(item => roleFilter.includes(item.roleName || ''));
        }
        if (tenantFilter.length > 0) {
            items = items.filter(item => tenantFilter.includes(item.tenantName || ''));
        }
        if (siteFilter.length > 0) {
            items = items.filter(item => siteFilter.includes(item.siteName || ''));
        }
        if (statusFilter !== 'all') {
            items = items.filter(item =>
                statusFilter === 'active' ? item.status === 'active' : item.status === 'pending'
            );
        }

        // 3. Sort
        if (sortConfig) {
            items.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (aValue === undefined || aValue === null) aValue = '';
                if (bValue === undefined || bValue === null) bValue = '';

                if (sortConfig.key === 'createdAt') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                } else if (typeof aValue === 'string' && typeof bValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [allItems, searchQuery, roleFilter, tenantFilter, siteFilter, statusFilter, sortConfig]);

    // 4. Group by Tenant
    const groupedItems = useMemo(() => {
        const groups: Record<string, { users: any[], invites: any[] }> = {};

        filteredAndSortedItems.forEach(item => {
            const tenantName = item.tenantName || 'No Tenant (System)';
            if (!groups[tenantName]) {
                groups[tenantName] = { users: [], invites: [] };
            }
            if (item.type === 'user') {
                groups[tenantName].users.push(item);
            } else {
                groups[tenantName].invites.push(item);
            }
        });

        // Sort groups by tenant name, but keep "No Tenant (System)" at the bottom
        return Object.entries(groups).sort((a, b) => {
            if (a[0] === 'No Tenant (System)') return 1;
            if (b[0] === 'No Tenant (System)') return -1;
            return a[0].localeCompare(b[0]);
        });
    }, [filteredAndSortedItems]);


    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    return (
            <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage users and invitations grouped by tenant.</p>
                </div>
                <InviteUserDialog onSuccess={refetch} />
            </div>

            <ResendStatusAlert
                configured={emailConfig?.resendConfigured}
                description="`RESEND_API_KEY` is missing in this environment. Invites and admin-triggered password resets will need to be shared manually."
            />

            <div className="flex flex-col space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-lg border shadow-sm">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users, emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[130px] h-9 text-sm border-dashed">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>

                        <MultiSelectFilter
                            title="Tenant"
                            options={uniqueTenants.map(t => ({ label: t, value: t }))}
                            selectedValues={tenantFilter}
                            onSelect={setTenantFilter}
                        />

                        <MultiSelectFilter
                            title="Site"
                            options={uniqueSites.map(s => ({ label: s, value: s }))}
                            selectedValues={siteFilter}
                            onSelect={setSiteFilter}
                        />

                        <MultiSelectFilter
                            title="Role"
                            options={uniqueRoles.map(r => ({ label: r, value: r }))}
                            selectedValues={roleFilter}
                            onSelect={setRoleFilter}
                        />

                        {(searchQuery || roleFilter.length > 0 || tenantFilter.length > 0 || siteFilter.length > 0 || statusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setRoleFilter([]);
                                    setTenantFilter([]);
                                    setSiteFilter([]);
                                    setStatusFilter('all');
                                }}
                                className="h-9 px-2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4 mr-1" /> Clear
                            </Button>
                        )}

                        <div className="h-8 w-px bg-border mx-2" />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsGroupedByTenant(!isGroupedByTenant)}
                            className="h-9"
                        >
                            {isGroupedByTenant ? (
                                <>
                                    <Rows className="h-4 w-4 mr-2" />
                                    Ungroup
                                </>
                            ) : (
                                <>
                                    <LayoutList className="h-4 w-4 mr-2" />
                                    Group by Tenant
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : groupedItems.length === 0 ? (
                    <div className="text-center p-12 border rounded-lg bg-muted/10">
                        <p className="text-muted-foreground">No users found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {isGroupedByTenant ? (
                            groupedItems.map(([tenantName, { users, invites }]) => (
                                <TenantGroup
                                    key={tenantName}
                                    tenantName={tenantName}
                                    users={users}
                                    invites={invites}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                    actions={{
                                        onDelete: (item: any) => handleAction(item, 'delete'),
                                        onRevoke: (item: any) => handleAction(item, 'revoke'),
                                        onChangeEmail: (item: any) => handleAction(item, 'change-email'),
                                        onResetPwd: (item: any) => handleAction(item, 'reset-pwd')
                                    }}
                                />
                            ))
                        ) : (
                            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                                <UserTable
                                    items={filteredAndSortedItems}
                                    actions={{
                                        onDelete: (item: any) => handleAction(item, 'delete'),
                                        onRevoke: (item: any) => handleAction(item, 'revoke'),
                                        onChangeEmail: (item: any) => handleAction(item, 'change-email'),
                                        onResetPwd: (item: any) => handleAction(item, 'reset-pwd')
                                    }}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                    type="mixed"
                                    showTenant={true}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

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
                <DialogContent data-testid="reset-password-dialog">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            {emailConfig?.resendConfigured
                                ? <>Email a password reset link to <span className="font-medium text-foreground">{selectedItem?.name || selectedItem?.email}</span>?</>
                                : <>Generate a password reset link for <span className="font-medium text-foreground">{selectedItem?.name || selectedItem?.email}</span>? The link will need to be shared manually.</>}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={confirmReset} disabled={resetPwdMutation.isPending}>
                            {resetPwdMutation.isPending ? "Preparing..." : emailConfig?.resendConfigured ? "Send Reset Email" : "Generate Link"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Result - Show Link */}
            <Dialog open={!!resetPwdResult} onOpenChange={(open) => !open && setResetPwdResult(null)}>
                <DialogContent data-testid="manual-reset-dialog">
                    <DialogHeader>
                        <DialogTitle>Share Password Reset Link</DialogTitle>
                        <DialogDescription>
                            {resetPwdResult?.reason === 'missing-config'
                                ? "Automatic email delivery is unavailable, so share this link manually."
                                : "Resend could not deliver the email. Share this link manually instead."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 mt-2">
                        <Input readOnly value={resetPwdResult?.url || ''} />
                        <Button size="icon" onClick={() => {
                            if (resetPwdResult?.url) {
                                navigator.clipboard.writeText(resetPwdResult.url);
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

        </div >
    )
}

function TenantGroup({ tenantName, users, invites, sortConfig, onSort, actions }: {
    tenantName: string,
    users: any[],
    invites: any[],
    sortConfig: any,
    onSort: (key: string) => void,
    actions: any
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md bg-card shadow-sm overflow-hidden">
            <div className="flex items-center p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent mr-2 h-auto">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                </CollapsibleTrigger>

                <div className="flex-1 flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{tenantName}</h3>
                        <Badge variant="outline" className="text-xs font-normal">
                            {users.length} Users
                        </Badge>
                        {invites.length > 0 && (
                            <Badge variant="secondary" className="text-xs font-normal text-amber-600 bg-amber-50 border-amber-200">
                                {invites.length} Pending
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <CollapsibleContent>
                <div className="p-0">
                    {/* Active Users Section */}
                    {users.length > 0 && (
                        <div className="border-t">
                            <div className="bg-muted/10 px-4 py-2 text-xs font-medium text-muted-foreground flex items-center">
                                <User className="w-3 h-3 mr-2" /> Active Users
                            </div>
                            <UserTable
                                items={users}
                                actions={actions}
                                sortConfig={sortConfig}
                                onSort={onSort}
                                type="user"
                            />
                        </div>
                    )}

                    {/* Pending Invites Section */}
                    {invites.length > 0 && (
                        <div className="border-t">
                            <div className="bg-amber-50/50 px-4 py-2 text-xs font-medium text-amber-700 flex items-center">
                                <UserPlus className="w-3 h-3 mr-2" /> Pending Invitations
                            </div>
                            <UserTable
                                items={invites}
                                actions={actions}
                                sortConfig={sortConfig}
                                onSort={onSort}
                                type="invite"
                            />
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
