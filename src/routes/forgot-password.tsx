import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { getEmailConfigurationFn } from "@/core/functions/email-functions"
import { requestPasswordResetFn } from "@/core/functions/auth-functions"
import { ResendStatusAlert } from "@/components/email/resend-status-alert"
import { toast } from "sonner"

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPasswordPage,
})

const schema = z.object({
    email: z.string().email("Invalid email address")
})

function ForgotPasswordPage() {
    const { data: emailConfig } = useQuery({
        queryKey: ['email-configuration'],
        queryFn: () => getEmailConfigurationFn(),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: ""
        }
    })

    const mutation = useMutation({
        mutationFn: requestPasswordResetFn,
        onSuccess: (result) => {
            if (!result.emailServiceConfigured) {
                toast.error("Password reset email is unavailable in this environment.");
                return;
            }

            toast.success("If that account exists, a reset email is on the way.");
        },
        onError: (err) => {
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
                    <ResendStatusAlert
                        configured={emailConfig?.resendConfigured}
                        description="`RESEND_API_KEY` is not configured in this environment, so password reset emails cannot be sent right now."
                        className="mb-4"
                    />

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
