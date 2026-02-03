import * as React from 'react'
import { createFileRoute, useRouter, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authClient } from '@/lib/auth-client'
import { Shield, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

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
import { Alert, AlertDescription } from '@/components/ui/alert'

export const Route = createFileRoute('/login')({
    beforeLoad: ({ context }) => {
        if (context.user) {
            throw redirect({
                to: '/dashboard',
            })
        }
    },
    component: LoginComponent,
})

const formSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, "Password is required"),
})

function LoginComponent() {
    const router = useRouter()
    const [error, setError] = React.useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setError(null)
        await authClient.signIn.email({
            email: values.email,
            password: values.password,
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

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background p-4">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            </div>

            {/* Login Card */}
            <Card className="w-full max-w-md relative shadow-2xl border-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="space-y-3 pb-6">
                    <div className="flex justify-center mb-2">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                            <div className="relative flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg">
                                <Shield className="h-8 w-8 text-primary-foreground" />
                            </div>
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-center tracking-tight">
                        Welcome Back
                    </CardTitle>
                    <CardDescription className="text-center text-base">
                        Sign in to your HealthComply account
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="ml-2">{error}</AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-semibold">Email Address</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="name@example.com"
                                                    className="pl-10 h-11 transition-all focus:shadow-md"
                                                    {...field}
                                                />
                                            </div>
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
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-sm font-semibold">Password</FormLabel>
                                            <Link
                                                to="/forgot-password"
                                                className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                                            >
                                                Forgot password?
                                            </Link>
                                        </div>
                                        <FormControl>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    type="password"
                                                    placeholder="Enter your password"
                                                    className="pl-10 h-11 transition-all focus:shadow-md"
                                                    {...field}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-6 border-t">
                    <p className="text-sm text-center text-muted-foreground">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-primary font-semibold hover:underline transition-colors">
                            Sign up for free
                        </Link>
                    </p>
                    <p className="text-xs text-center text-muted-foreground/60">
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
