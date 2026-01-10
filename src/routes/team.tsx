import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
    getUsersAndInvitesFn,
    revokeInviteFn,
    deleteUserFn,
    generatePasswordResetLinkFn
} from '@/core/functions/admin-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useState, useMemo } from 'react'
import { Loader2, Copy, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import { UserTable } from '@/components/users/user-table'
import { InviteUserDialog } from '@/components/users/invite-user-dialog'
import { ChangeEmailDialog } from '@/components/users/change-email-dialog'
import { ChangeRoleDialog } from '@/components/users/change-role-dialog'
import { getCurrentUserRoleFn } from "@/core/functions/auth-functions"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute('/team')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    head: () => ({
        meta: [{ title: 'Team Management' }],
    }),
    component: TeamPage,
})

import { useSite } from '@/components/site-context'

// ...

function TeamPage() {
    // -- Global State for Dialogs --
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // Context
    const { activeSite } = useSite();

    // Dialog Open States
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
    const [resetPwdResult, setResetPwdResult] = useState<string | null>(null);
    const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);
    const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['team-users-and-invites', activeSite?.id], // Add activeSite.id to key
        queryFn: () => getUsersAndInvitesFn({ data: { siteId: activeSite?.id } }),
        // No strict enabled check needed, as all auth users can access this (scoped by server)
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
            toast.success("User removed");
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
        },
        onError: (err) => toast.error(err.message)
    });

    // -- Handlers --

    const handleAction = (item: any, action: 'delete' | 'revoke' | 'reset-pwd' | 'change-email' | 'change-role') => {
        setSelectedItem(item);
        if (action === 'delete') {
            setDeleteDialogOpen(true);
        } else if (action === 'revoke') {
            setRevokeDialogOpen(true);
        } else if (action === 'reset-pwd') {
            setResetConfirmOpen(true);
        } else if (action === 'change-email') {
            setChangeEmailDialogOpen(true);
        } else if (action === 'change-role') {
            setChangeRoleDialogOpen(true);
        }
    };

    const confirmReset = () => {
        if (selectedItem) {
            resetPwdMutation.mutate({ data: { userId: selectedItem.id } });
            setResetConfirmOpen(false);
        }
    };


    // -- Filtering & Sorting State --
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
    const [roleFilter, setRoleFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const allItems = useMemo(() => [
        ...(data?.users || []).map((u: any) => ({ ...u, type: 'user', status: 'active' })),
        ...(data?.invitations || []).map((i: any) => ({ ...i, type: 'invitation', status: 'pending' }))
    ], [data]);

    // Derived Filter Options
    const uniqueRoles = useMemo(() => Array.from(new Set(allItems.map(i => i.roleName).filter(Boolean))).sort(), [allItems]);

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
                    (item.siteName && item.siteName.toLowerCase().includes(term)) ||
                    (item.roleName && item.roleName.toLowerCase().includes(term))
                );
            });
        }

        // 2. Filters
        if (roleFilter.length > 0) {
            items = items.filter(item => roleFilter.includes(item.roleName || ''));
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
    }, [allItems, searchQuery, roleFilter, statusFilter, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };



    // ... inside TeamPage ...
    const { data: session } = authClient.useSession();
    const isSystemAdmin = (session?.user as any)?.isSystemAdmin;

    const { data: roleData } = useQuery({
        queryKey: ['my-role-team', session?.user?.id],
        queryFn: () => getCurrentUserRoleFn(),
        enabled: !!session?.user
    });

    const userRole = roleData?.role || (session as any)?.role;
    const canInvite = isSystemAdmin || ["Practice Manager", "Admin", "Compliance Officer", "GP Partner"].includes(userRole);


    return (
        <MainLayout title="Team Management">
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Team Members</h2>
                        <p className="text-muted-foreground">Manage your team and invitations.</p>
                    </div>
                    {canInvite && <InviteUserDialog onSuccess={refetch} />}
                </div>

                <div className="flex flex-col space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-lg border shadow-sm">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search team..."
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
                                title="Role"
                                options={uniqueRoles.map(r => ({ label: r, value: r }))}
                                selectedValues={roleFilter}
                                onSelect={setRoleFilter}
                            />

                            {(searchQuery || roleFilter.length > 0 || statusFilter !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setRoleFilter([]);
                                        setStatusFilter('all');
                                    }}
                                    className="h-9 px-2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4 mr-1" /> Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredAndSortedItems.length === 0 ? (
                        <div className="text-center p-12 border rounded-lg bg-muted/10">
                            <p className="text-muted-foreground">No team members found.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                            <UserTable
                                items={filteredAndSortedItems}
                                actions={{
                                    onDelete: canInvite ? (item: any) => handleAction(item, 'delete') : undefined,
                                    onRevoke: canInvite ? (item: any) => handleAction(item, 'revoke') : undefined,
                                    onChangeEmail: canInvite ? (item: any) => handleAction(item, 'change-email') : undefined,
                                    onResetPwd: canInvite ? (item: any) => handleAction(item, 'reset-pwd') : undefined,
                                    onChangeRole: canInvite ? (item: any) => handleAction(item, 'change-role') : undefined
                                }}
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                type="mixed"
                                showTenant={false} // Don't show tenant column in Team view (assumed single tenant)
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* --- Dialogs --- */}

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <span className="font-medium text-foreground">{selectedItem?.name || selectedItem?.email}</span>?
                            <br /><br />
                            This will revoke their access to this team.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteUserMutation.mutate({ data: { userId: selectedItem.id } })} disabled={deleteUserMutation.isPending}>
                            {deleteUserMutation.isPending ? "Removing..." : "Remove User"}
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

            {/* Reset Password Result */}
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

            <ChangeEmailDialog
                open={changeEmailDialogOpen}
                onOpenChange={setChangeEmailDialogOpen}
                user={selectedItem}
                onSuccess={() => {
                    refetch();
                    setSelectedItem(null);
                }}
            />

            <ChangeRoleDialog
                open={changeRoleDialogOpen}
                onOpenChange={setChangeRoleDialogOpen}
                user={selectedItem}
                onSuccess={() => {
                    refetch();
                    setSelectedItem(null);
                }}
            />
        </MainLayout>
    )
}
