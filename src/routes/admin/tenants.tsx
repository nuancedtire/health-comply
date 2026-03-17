import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTenantFn, getTenantsFn, deleteTenantFn, inviteUserFn } from '@/core/functions/admin-functions'
import { getEmailConfigurationFn } from '@/core/functions/email-functions'
import { ResendStatusAlert } from '@/components/email/resend-status-alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authClient } from '@/lib/auth-client'
import { Trash2, Copy, Building, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/tenants')({
  component: TenantsPage,
})

const createTenantSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
})

function TenantsPage() {
  const { data: session } = authClient.useSession()
  const isSystemAdmin = (session?.user as any)?.isSystemAdmin;
  const queryClient = useQueryClient();

  // Invite Modal State
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [manualInviteResult, setManualInviteResult] = useState<{
    email: string
    url: string
    reason: 'missing-config' | 'send-failed'
  } | null>(null)

  // Delete Modal State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<any>(null)
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('')

  const handleDeleteClick = (tenant: any) => {
    setTenantToDelete(tenant)
    setDeleteConfirmationName('') // Reset input
    setDeleteDialogOpen(true)
  }

  // Fetch Tenants
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => getTenantsFn(),
    enabled: !!isSystemAdmin
  });
  const { data: emailConfig } = useQuery({
    queryKey: ['email-configuration'],
    queryFn: () => getEmailConfigurationFn(),
  });

  const form = useForm<z.infer<typeof createTenantSchema>>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
    }
  })

  const createMutation = useMutation({
    mutationFn: createTenantFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      form.reset()
      toast.success("Tenant created successfully")
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTenantFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success("Tenant deleted successfully")
      setDeleteDialogOpen(false)
      setTenantToDelete(null)
    },
    onError: (error) => {
      toast.error(`Error deleting tenant: ${error.message}`)
    }
  })

  const confirmDelete = () => {
    if (tenantToDelete) {
      deleteMutation.mutate({ data: { tenantId: tenantToDelete.id } })
    }
  }

  const inviteMutation = useMutation({
    mutationFn: inviteUserFn,
    onSuccess: (result, variables) => {
      setInviteDialogOpen(false)
      setInviteEmail('')
      queryClient.invalidateQueries({ queryKey: ['tenants'] });

      if (result.emailDelivery.sent) {
        toast.success("Invitation emailed", {
          description: `${variables.data.email} will receive a signup link shortly.`,
        })
        return
      }

      navigator.clipboard.writeText(result.emailDelivery.inviteUrl)
      setManualInviteResult({
        email: variables.data.email,
        url: result.emailDelivery.inviteUrl,
        reason: result.emailDelivery.configured ? 'send-failed' : 'missing-config'
      })
      toast(
        result.emailDelivery.configured
          ? "Invitation created, but email delivery failed."
          : "Invitation created without automatic email delivery.",
        {
          description: "The invite link has been copied so you can share it manually.",
        }
      )
    },
    onError: (error) => {
      toast.error(`Failed to send invite: ${error.message}`)
    }
  })


  const onSubmit = (values: z.infer<typeof createTenantSchema>) => {
    createMutation.mutate({ data: values })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard")
  }

  const openInviteDialog = (tenant: any) => {
    setSelectedTenant(tenant)
    setInviteEmail('')
    setInviteDialogOpen(true)
  }

  const handleInviteSubmit = () => {
    if (!inviteEmail || !selectedTenant) return;

    inviteMutation.mutate({
      data: {
        email: inviteEmail,
        tenantId: selectedTenant.id,
        role: "Practice Manager" // Use role name string, not roleId
      }
    })
  }

  if (!isSystemAdmin) {
    return <div className="p-8">Access Denied: System Admins only.</div>
  }

  return (
    <div className="max-w-full px-3 mx-auto space-y-8 py-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage tenants, sites, and ensure practice managers are assigned.
          </p>
        </div>
      </div>

      <ResendStatusAlert
        configured={emailConfig?.resendConfigured}
        description="`RESEND_API_KEY` is missing in this environment. Practice manager invites will need to be shared manually."
      />

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Create New Organization
          </CardTitle>
          <CardDescription>
            This will create a new tenant environment and seed standard roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4 max-w-lg">
            <div className="space-y-2 flex-1">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="e.g. Health Plus Clinic"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Organizations</CardTitle>
          <CardDescription>
            Overview of all tenants and their compliance status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : tenants && tenants.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-12 px-4 text-left font-medium w-[250px]">Organization</th>
                    <th className="h-12 px-4 text-left font-medium">Sites</th>
                    <th className="h-12 px-4 text-left font-medium">Practice Manager</th>
                    <th className="h-12 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-medium text-base mb-1">{tenant.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted w-fit px-1.5 py-0.5 rounded">
                          {tenant.id}
                          <Copy
                            className="h-3 w-3 cursor-pointer hover:text-foreground"
                            onClick={() => copyToClipboard(tenant.id)}
                          />
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {tenant.sites && tenant.sites.length > 0 ? (
                            tenant.sites.map((site: any) => (
                              <Badge key={site.id} variant="outline" className="bg-background">
                                {site.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-xs italic">No sites created</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-2">
                          {tenant.practiceManagers && tenant.practiceManagers.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {tenant.practiceManagers.map((pm: any) => (
                                <div key={pm.userId} className="flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  <span>{pm.userName || pm.email}</span>
                                </div>
                              ))}
                            </div>
                          ) : tenant.pendingInvitations && tenant.pendingInvitations.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {tenant.pendingInvitations.map((inv: any) => (
                                <div key={inv.id} className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-md border border-amber-200 dark:border-amber-900/50 w-fit">
                                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span className="text-xs font-medium">Invited: {inv.email}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-md border border-red-200 dark:border-red-900/50 w-fit">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Missing PM</span>
                            </div>
                          )}

                          {(!tenant.practiceManagers || tenant.practiceManagers.length === 0) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 mt-1"
                              onClick={() => openInviteDialog(tenant)}
                            >
                              <UserPlus className="h-3 w-3" />
                              {tenant.pendingInvitations && tenant.pendingInvitations.length > 0 ? "Resend Invite" : "Invite Manager"}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-top text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(tenant)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
              <Building className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No organizations found.</p>
              <p className="text-sm text-muted-foreground">Create one above to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Practice Manager</DialogTitle>
            <DialogDescription>
              Create an invitation for <span className="font-medium text-foreground">{selectedTenant?.name}</span> and email it when delivery is available.
            </DialogDescription>
          </DialogHeader>

          <ResendStatusAlert
            configured={emailConfig?.resendConfigured}
            description="`RESEND_API_KEY` is not configured here. This invite will be created, and you'll receive a shareable link instead of an email being sent."
          />

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="manager@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInviteSubmit} disabled={inviteMutation.isPending || !inviteEmail}>
              {inviteMutation.isPending ? "Preparing..." : emailConfig?.resendConfigured ? "Send Invitation" : "Create Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manualInviteResult} onOpenChange={(open) => !open && setManualInviteResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Invitation Link</DialogTitle>
            <DialogDescription>
              {manualInviteResult?.reason === 'missing-config'
                ? "Automatic email delivery is unavailable, so share this invite link manually."
                : "The invite was created, but Resend could not deliver it. Share this link manually instead."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Recipient: <span className="font-medium text-foreground">{manualInviteResult?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={manualInviteResult?.url || ''} />
              <Button size="icon" onClick={() => {
                if (!manualInviteResult?.url) return
                navigator.clipboard.writeText(manualInviteResult.url)
                toast.success("Invitation link copied")
              }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setManualInviteResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{tenantToDelete?.name}</span>?
              <br /><br />
              <span className="text-red-500 font-semibold">This action is irreversible.</span> It will permanently delete all sites, users, policies, documents, and data associated with this tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Label>To confirm, type "{tenantToDelete?.name}" below:</Label>
            <Input
              value={deleteConfirmationName}
              onChange={(e) => setDeleteConfirmationName(e.target.value)}
              placeholder={tenantToDelete?.name}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending || deleteConfirmationName !== tenantToDelete?.name}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
