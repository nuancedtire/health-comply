import * as React from 'react'
import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authClient } from '@/lib/auth-client'
import { useQuery } from '@tanstack/react-query'
import {
    checkInviteFn,
    checkSystemInitializedFn,
    createSystemAdminFn,
    findTenantFn
} from '@/core/functions/auth-functions'

import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const searchSchema = z.object({
    token: z.string().optional(),
})

export const Route = createFileRoute('/signup')({
    validateSearch: (search) => searchSchema.parse(search),
    component: SignupComponent,
})

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
})

function SignupComponent() {
    const router = useRouter()
    const { token } = Route.useSearch()
    const [error, setError] = React.useState<string | null>(null)

    // Check system initialization status
    const { data: systemStatus, isLoading: isCheckingSystem } = useQuery({
        queryKey: ['check-system-init'],
        queryFn: () => checkSystemInitializedFn(),
        retry: false
    })

    // Check invite if token exists
    const { data: inviteData, isLoading: isCheckingInvite, error: inviteError } = useQuery({
        queryKey: ['check-invite', token],
        queryFn: () => checkInviteFn({ data: { token: token! } }),
        enabled: !!token,
        retry: false
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
        },
    })

    // Pre-fill email when invite data loads
    React.useEffect(() => {
        if (inviteData?.email) {
            form.setValue('email', inviteData.email)
        }
    }, [inviteData, form])

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(null)
        await authClient.signUp.email({
            email: values.email,
            password: values.password,
            name: values.name,
            callbackURL: "/dashboard"
        }, {
            onSuccess: async () => {
                router.invalidate()
                await router.navigate({ to: '/dashboard' })
            },
            onError: (ctx) => {
                setError(ctx.error.message);
            }
        })
    }

    if (isCheckingSystem) {
        return null; // or spinner
    }

    // NO TOKEN -> Check bootstapping
    if (systemStatus?.initialized === false) {
        return <InitializeSystem />
    }

    if (token) {
        if (isCheckingInvite) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Verifying Invitation...</CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            )
        }

        if (inviteError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                    <Card className="w-full max-w-md border-red-500">
                        <CardHeader>
                            <CardTitle className="text-red-500">Invalid Invitation</CardTitle>
                            <CardDescription>
                                This invitation link is invalid or has expired.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-center">
                            <Link to="/signup" search={{}} className="text-primary hover:underline">
                                Go to standard sign up
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            )
        }

        // Render Signup Form for Invited Users
        // InviteData is guaranteed here because isCheckingInvite is false and inviteError is null
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>
                            Join {inviteData?.tenantName}
                        </CardTitle>
                        <CardDescription>
                            You have been invited as {inviteData?.roleName} for {inviteData?.siteName || 'all sites'}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="name@example.com"
                                                    {...field}
                                                    disabled={true}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Choose Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? "Creating account..." : "Complete Sign Up"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <TenantLookup />
}

function InitializeSystem() {
    const [error, setError] = React.useState<string | null>(null)
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", email: "", password: "" },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(null)
        try {
            const res = await createSystemAdminFn({ data: values });
            if (res.success) {
                // We need to actually log them in differently since createSystemAdminFn created the user but maybe didn't set the cookie locally in the browser context if using better-auth client?
                // Wait, createSystemAdminFn calls auth.api.signUpEmail which creates user.
                // But does it set the session cookie? Server-side call yes, but client might need to handle it.
                // Actually, let's just use the `authClient` to sign in immediately after success or assume the user exists and let them sign in.
                // Safer: Just sign them in with the password they just set to get the session token.
                await authClient.signIn.email({
                    email: values.email,
                    password: values.password
                }, {
                    onSuccess: async () => {
                        window.location.href = "/dashboard"; // Force reload to pick up session
                    },
                    onError: (ctx) => setError(ctx.error.message)
                })
            }
        } catch (e: any) {
            setError(e.message || "Failed to initialize system");
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md border-blue-500 border-2">
                <CardHeader>
                    <CardTitle>Initialize System</CardTitle>
                    <CardDescription>
                        Welcome! Create the first <strong>System Administrator</strong> account to get started.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin Email</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl><Input type="password" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Initializing..." : "Create System Admin"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}

function TenantLookup() {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")
    const [query, setQuery] = React.useState("")
    const [manualToken, setManualToken] = React.useState("")

    // Debounce query slightly to avoid too many requests
    const [debouncedQuery, setDebouncedQuery] = React.useState("")
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300)
        return () => clearTimeout(timer)
    }, [query])

    const { data: tenants, isLoading } = useQuery({
        queryKey: ['find-tenant', debouncedQuery],
        queryFn: () => findTenantFn({ data: { query: debouncedQuery } }),
        enabled: debouncedQuery.length >= 2,
    })

    const selectedTenant = tenants?.find((t: any) => t.id === value)

    const handleJoin = async () => {
        if (!manualToken) return;
        await router.navigate({ to: '/signup', search: { token: manualToken } })
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Find Your Team</CardTitle>
                    <CardDescription>
                        Search for your organization to join.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                            >
                                {value
                                    ? tenants?.find((t: any) => t.id === value)?.name || selectedTenant?.name || "Select organization..."
                                    : "Search organization..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Type to search..."
                                    value={query}
                                    onValueChange={setQuery}
                                />
                                <CommandList>
                                    {isLoading && (
                                        <div className="py-6 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                                        </div>
                                    )}
                                    {!isLoading && tenants?.length === 0 && debouncedQuery.length >= 2 && (
                                        <CommandEmpty>No organization found.</CommandEmpty>
                                    )}
                                    {!isLoading && debouncedQuery.length < 2 && (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                            Type at least 2 characters...
                                        </div>
                                    )}
                                    <CommandGroup>
                                        {tenants?.map((tenant: any) => (
                                            <CommandItem
                                                key={tenant.id}
                                                value={tenant.id}
                                                onSelect={(currentValue) => {
                                                    setValue(currentValue === value ? "" : currentValue)
                                                    setOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        value === tenant.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {tenant.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {value && (
                        <div className="p-4 border rounded-md bg-muted/50 text-center animate-in fade-in zoom-in slide-in-from-bottom-2">
                            <h4 className="font-semibold mb-2">Join {tenants?.find((t: any) => t.id === value)?.name || selectedTenant?.name}</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                Do you have an invitation token? Enter it below to join.
                            </p>
                            <div className="space-y-2">
                                <Input
                                    placeholder="Paste invitation token here..."
                                    value={manualToken}
                                    onChange={(e) => setManualToken(e.target.value)}
                                />
                                <Button className="w-full" onClick={handleJoin} disabled={!manualToken}>
                                    Validate & Join
                                </Button>
                            </div>
                        </div>
                    )}

                </CardContent>
                <CardFooter className="flex flex-col gap-4 text-center">
                    <div className="text-sm text-muted-foreground">
                        Don't have an organization account?
                    </div>
                    <Link to="/login" className="text-primary text-sm hover:underline">
                        Are you a System Admin? Sign In
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}

