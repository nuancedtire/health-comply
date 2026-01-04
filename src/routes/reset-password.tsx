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
import { resetPasswordFn } from "@/core/functions/auth-functions"
import { toast } from "sonner"
import { useState } from "react"

// Schema for query params
const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: searchSchema,
})

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

function ResetPasswordPage() {
  const search = Route.useSearch();
  const token = search.token;

  const [success, setSuccess] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  })

  const mutation = useMutation({
    mutationFn: resetPasswordFn,
    onSuccess: () => {
      toast.success("Password updated successfully");
      setSuccess(true);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reset password. Token may be invalid or expired.");
    }
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!token) {
      toast.error("Missing token");
      // Optionally redirect
      return;
    }
    mutation.mutate({ data: { token, newPassword: data.password } });
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md text-center p-6">
          <p className="text-red-500 mb-4 font-medium">Invalid Link: Missing Token</p>
          <p className="text-sm text-muted-foreground mb-4">You need a valid reset token to access this page.</p>
          <Button asChild>
            <Link to="/forgot-password">Request New Link</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Enter your new password below to reset your account access.</CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" {...form.register("password")} placeholder="At least 8 characters" />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" {...form.register("confirmPassword")} placeholder="Re-enter password" />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
                <p className="font-semibold">Password changed successfully!</p>
                <p>You can now log in with your new password.</p>
              </div>
              <Button className="w-full" asChild>
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
