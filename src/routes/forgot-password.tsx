import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { requestPasswordResetFn } from "@/core/functions/auth-functions"
import { toast } from "sonner"
import { useState } from "react"

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPasswordPage,
})

const schema = z.object({
    email: z.string().email("Invalid email address")
})

function ForgotPasswordPage() {
    const [resetLink, setResetLink] = useState<string | null>(null);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: ""
        }
    })

    const mutation = useMutation({
        mutationFn: requestPasswordResetFn,
        onSuccess: (data) => {
            if (data.token) {
                // In a real app we wouldn't show this, but for demo:
                const link = `${window.location.origin}/reset-password?token=${data.token}`;
                setResetLink(link);
                toast.success("Reset link generated (Demo)");
            } else {
                toast.success("If an account exists, an email has been sent.");
            }
        },
        onError: (err) => {
            // For security, don't reveal much, but for debugging:
            console.error(err);
            toast.error("An error occurred.");
        }
    })

    const onSubmit = (data: z.infer<typeof schema>) => {
        mutation.mutate({ data });
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Forgot Password</CardTitle>
                    <CardDescription>Enter your email to reset your password.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!resetLink ? (
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input {...form.register("email")} placeholder="name@example.com" />
                                {form.formState.errors.email && (
                                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                                {mutation.isPending ? "Sending..." : "Send Reset Link"}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                                <p className="font-semibold mb-2">Demo Mode: Reset Link Generated</p>
                                <p className="break-all font-mono">{resetLink}</p>
                            </div>
                            <Button className="w-full" asChild>
                                <a href={resetLink}>Go to Reset Page</a>
                            </Button>
                        </div>
                    )}

                    <div className="mt-4 text-center">
                        <Link to="/login" className="text-sm text-muted-foreground hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
