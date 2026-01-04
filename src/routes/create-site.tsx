import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Building, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createSiteFn } from "@/core/functions/admin-functions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useSite } from "@/components/site-context"

import { MainLayout } from '@/components/main-layout'

export const Route = createFileRoute('/create-site')({
    component: CreateSitePage,
})

const FormSchema = z.object({
    name: z.string().min(2, {
        message: "Site name must be at least 2 characters.",
    }),
    address: z.string().optional(),
})

function CreateSitePage() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { tenantId } = useSite()

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: "",
            address: "",
        },
    })

    const createSiteMutation = useMutation({
        mutationFn: createSiteFn,
        onSuccess: () => {
            toast.success("Site created successfully")
            // Invalidate sites query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['sites'] })

            // Set as active site and redirect
            // We construct a temporary site object or fetch it. 
            // Ideally backend returns the full object or we wait for refetch.
            // For now, let's just navigate to dashboard, and let the context pick up the new list.
            navigate({ to: '/dashboard' })
        },
        onError: (error) => {
            toast.error("Failed to create site")
            console.error(error)
        }
    })

    function onSubmit(data: z.infer<typeof FormSchema>) {
        if (!tenantId) {
            toast.error("No tenant ID found. Please login again.")
            return
        }

        createSiteMutation.mutate({
            data: {
                name: data.name,
                address: data.address,
                tenantId: tenantId
            }
        })
    }

    return (
        <MainLayout title="Create New Site">
            <div className="flex flex-col gap-8 p-4 md:p-8">
                <div className="flex flex-col gap-2">
                    <Link to="/dashboard" className="flex w-fit items-center text-sm text-muted-foreground hover:text-foreground mb-2">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex p-3 bg-muted rounded-xl ring-1 ring-border shadow-sm">
                            <Building className="h-6 w-6 text-foreground" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Create New Site</h1>
                            <p className="text-muted-foreground">
                                Add a new location or branch to your organization.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-6 bg-card p-6 rounded-2xl border shadow-sm h-fit">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base">Site Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. London Branch"
                                                    className="h-12 text-base"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                This is the display name for the site.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base">Address (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. 123 Main St"
                                                    className="h-12 text-base"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Physical address of the site.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="pt-4">
                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all"
                                        disabled={createSiteMutation.isPending}
                                    >
                                        {createSiteMutation.isPending ? "Creating..." : "Create Site"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>

                    <div className="hidden lg:flex flex-col justify-center p-8 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
                        <div className="max-w-sm space-y-4">
                            <h3 className="text-lg font-semibold">Why create multiple sites?</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Creating separate sites allows you to manage compliance, documents, and teams for each physical location independently.
                            </p>
                            <ul className="space-y-2">
                                {[
                                    "Location-specific checklists",
                                    "Separate document lockers",
                                    "Site-based user permissions",
                                    "Individual status reports"
                                ].map((benefit, i) => (
                                    <li key={i} className="flex items-center text-sm text-muted-foreground">
                                        <div className="mr-2 size-1 rounded-full bg-primary" />
                                        {benefit}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
