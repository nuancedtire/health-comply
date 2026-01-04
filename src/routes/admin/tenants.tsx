import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTenantFn, getTenantsFn, deleteTenantFn } from '@/core/functions/admin-functions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authClient } from '@/lib/auth-client'
import { Trash2, Copy } from 'lucide-react'

export const Route = createFileRoute('/admin/tenants')({
  component: CreateTenantPage,
})

const createTenantSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
})

function CreateTenantPage() {
  const { data: session } = authClient.useSession()
  const isSystemAdmin = (session?.user as any)?.isSystemAdmin;
  const queryClient = useQueryClient();

  // Fetch Tenants
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => getTenantsFn(),
    enabled: !!isSystemAdmin
  });

  const form = useForm<z.infer<typeof createTenantSchema>>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
    }
  })

  const createMutation = useMutation({
    mutationFn: createTenantFn,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      form.reset()
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTenantFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (error) => {
      alert(`Error deleting tenant: ${error.message}`)
    }
  })

  const onSubmit = (values: z.infer<typeof createTenantSchema>) => {
    createMutation.mutate({ data: values })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: toast notification
  }

  if (!isSystemAdmin) {
    return <div className="p-8">Access Denied: System Admins only.</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Organization (Tenant)</CardTitle>
          <CardDescription>
            This will create a new tenant and seed standard roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-4">
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
              {createMutation.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Organizations</CardTitle>
          <CardDescription>
            List of all registered tenants in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading tenants...</p>
          ) : tenants && tenants.length > 0 ? (
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium">Tenant ID</th>
                    <th className="h-10 px-4 text-left font-medium">Name</th>
                    <th className="h-10 px-4 text-left font-medium">Created At</th>
                    <th className="h-10 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4 font-mono">
                        <div className="flex items-center gap-2">
                          {tenant.id}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => copyToClipboard(tenant.id)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{tenant.name}</td>
                      <td className="p-4 text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${tenant.name}"? This is irreversible.`)) {
                              deleteMutation.mutate({ data: { tenantId: tenant.id } })
                            }
                          }}
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
            <p className="text-center text-muted-foreground py-8">No tenants found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
