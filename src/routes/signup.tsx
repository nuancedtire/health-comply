import * as React from 'react'
import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authClient } from '@/lib/auth-client'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
    checkInviteFn,
    checkSystemInitializedFn,
    createSystemAdminFn,
    findTenantFn,
    signupAndCreateTenantFn
} from '@/core/functions/auth-functions'

import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Loader2, Building2, Users, ArrowLeft, ArrowRight } from 'lucide-react'
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
    FormDescription,
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

    const TENANT_ROLE_IDS = ["Director", "Admin", "Compliance Officer"]

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(null)
        // Directors and tenant-scoped roles need to create a site before using the app
        const isTenantRole = TENANT_ROLE_IDS.includes(inviteData?.roleName ?? "")
        const redirectTo = token && isTenantRole ? '/create-site' : '/dashboard'

        await authClient.signUp.email({
            email: values.email,
            password: values.password,
            name: values.name,
            callbackURL: redirectTo
        }, {
            onSuccess: async () => {
                router.invalidate()
                await router.navigate({ to: redirectTo })
            },
            onError: (ctx) => {
                setError(ctx.error.message);
            }
        })
    }

    if (isCheckingSystem) {
        return null
    }

    // NO TOKEN -> Check bootstrapping
    if (systemStatus?.initialized === false) {
        return <InitializeSystem />
    }

    if (token) {
        if (isCheckingInvite) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-background p-4">
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
                <div className="flex items-center justify-center min-h-screen bg-background p-4">
                    <Card className="w-full max-w-md border-destructive">
                        <CardHeader>
                            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
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
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
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

    return <SignupChoice />
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
                await authClient.signIn.email({
                    email: values.email,
                    password: values.password
                }, {
                    onSuccess: async () => {
                        window.location.href = "/dashboard";
                    },
                    onError: (ctx) => setError(ctx.error.message)
                })
            }
        } catch (e: any) {
            setError(e.message || "Failed to initialize system");
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border-primary border-2">
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

// ===== NEW: Sign Up Choice — Create Organization or Join Existing =====

function SignupChoice() {
    const [mode, setMode] = React.useState<'choice' | 'create' | 'join'>('choice')

    if (mode === 'create') {
        return <CreateOrganization onBack={() => setMode('choice')} />
    }
    if (mode === 'join') {
        return <JoinExistingTeam onBack={() => setMode('choice')} />
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-2xl space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Get Started</h1>
                    <p className="text-muted-foreground">
                        Create a new organization or join an existing team.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card
                        className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                        onClick={() => setMode('create')}
                    >
                        <CardHeader className="text-center pb-4">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                                <Building2 className="w-7 h-7" />
                            </div>
                            <CardTitle className="text-xl">Create Organization</CardTitle>
                            <CardDescription>
                                Set up a new organization and start managing compliance.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <div className="size-1 rounded-full bg-primary" />
                                    You become the Director
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="size-1 rounded-full bg-primary" />
                                    Create sites and invite your team
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="size-1 rounded-full bg-primary" />
                                    Get started with a compliance starter pack
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
                                Get Started
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card
                        className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                        onClick={() => setMode('join')}
                    >
                        <CardHeader className="text-center pb-4">
                            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                                <Users className="w-7 h-7" />
                            </div>
                            <CardTitle className="text-xl">Join Existing Team</CardTitle>
                            <CardDescription>
                                You have an invitation to join an existing organization.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <div className="size-1 rounded-full bg-primary" />
                                    Use your invitation link or token
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="size-1 rounded-full bg-primary" />
                                    Search for your organization
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="size-1 rounded-full bg-primary" />
                                    Join with your assigned role
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline">
                                Join Team
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="text-center">
                    <Link to="/login" className="text-primary text-sm hover:underline">
                        Already have an account? Sign In
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ===== Create Organization Flow =====

const createOrgSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
})

function CreateOrganization({ onBack }: { onBack: () => void }) {
    const [error, setError] = React.useState<string | null>(null)

    const form = useForm<z.infer<typeof createOrgSchema>>({
        resolver: zodResolver(createOrgSchema),
        defaultValues: { name: "", email: "", password: "", organizationName: "" },
    })

    const createMutation = useMutation({
        mutationFn: signupAndCreateTenantFn,
        onSuccess: async (data) => {
            // Sign in the new user
            const values = form.getValues()
            await authClient.signIn.email({
                email: values.email,
                password: values.password
            }, {
                onSuccess: async () => {
                    // Redirect to onboarding with the new tenantId
                    window.location.href = `/onboarding?tenantId=${data.tenantId}`
                },
                onError: (ctx) => setError(ctx.error.message)
            })
        },
        onError: (err: any) => {
            setError(err.message || "Failed to create organization")
        }
    })

    function onSubmit(values: z.infer<typeof createOrgSchema>) {
        setError(null)
        createMutation.mutate({ data: values })
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <CardTitle className="text-2xl">Create Organization</CardTitle>
                    <CardDescription>
                        Set up your account and organization. You'll be assigned the Director role.
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
                                name="organizationName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Organization Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Southside Medical Practice" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The name of your healthcare organization.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="border-t pt-4 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Your Name</FormLabel>
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
                                                <Input placeholder="you@practice.com" {...field} />
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
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Min. 8 characters" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? "Creating..." : "Create Organization & Sign Up"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link to="/login" className="text-primary text-sm hover:underline">
                        Already have an account? Sign In
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}

// ===== Join Existing Team Flow =====

function JoinExistingTeam({ onBack }: { onBack: () => void }) {
    const router = useRouter()
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")
    const [query, setQuery] = React.useState("")
    const [manualToken, setManualToken] = React.useState("")

    const handleTokenChange = (val: string) => {
        if (val.includes('token=')) {
            try {
                const searchPart = val.includes('?') ? val.split('?')[1] : val;
                const params = new URLSearchParams(searchPart);
                const tokenParam = params.get('token');
                if (tokenParam) {
                    setManualToken(tokenParam);
                    return;
                }
            } catch {
                const match = val.match(/[?&]token=([^&]+)/);
                if (match && match[1]) {
                    setManualToken(match[1]);
                    return;
                }
            }
        }
        setManualToken(val);
    }

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
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <CardTitle>Join Existing Team</CardTitle>
                    <CardDescription>
                        Search for your organization or paste your invitation link.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Direct token/link input — most common path */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Invitation Link or Token</label>
                        <Input
                            placeholder="Paste your invitation link or token here..."
                            value={manualToken}
                            onChange={(e) => handleTokenChange(e.target.value)}
                        />
                        <Button className="w-full" onClick={handleJoin} disabled={!manualToken}>
                            Validate & Join
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                or search by name
                            </span>
                        </div>
                    </div>

                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                            >
                                {value
                                    ? selectedTenant?.name || "Select organization..."
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

                    {value && !manualToken && (
                        <div className="p-4 border rounded-md bg-muted/50 text-center animate-in fade-in zoom-in slide-in-from-bottom-2">
                            <h4 className="font-semibold mb-2">Join {selectedTenant?.name}</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                You need an invitation token to join. Ask your organization's Director for an invite.
                            </p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4 text-center">
                    <Link to="/login" className="text-primary text-sm hover:underline">
                        Already have an account? Sign In
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
