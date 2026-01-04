import { createFileRoute, redirect } from '@tanstack/react-router'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/account')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: AccountPage,
})

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email().readonly(), // Email usually read-only here or triggers re-verification logic
    image: z.string().optional()
})

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required")
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
})

function AccountPage() {
    const { data: session, refetch } = authClient.useSession()

    // -- Profile Form --
    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        values: {
            name: session?.user?.name || "",
            email: session?.user?.email || "",
            image: session?.user?.image || ""
        }
    })

    const [isProfileSaving, setIsProfileSaving] = useState(false)

    const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        setIsProfileSaving(true)
        await authClient.updateUser({
            name: values.name,
            image: values.image
        }, {
            onSuccess: () => {
                toast.success("Profile updated")
                refetch() // Refresh session
                setIsProfileSaving(false)
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
                setIsProfileSaving(false)
            }
        })
    }

    // -- Password Form --
    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
        }
    })

    const [isPasswordSaving, setIsPasswordSaving] = useState(false)

    const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
        setIsPasswordSaving(true)
        await authClient.changePassword({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
            revokeOtherSessions: true
        }, {
            onSuccess: () => {
                toast.success("Password changed successfully")
                passwordForm.reset()
                setIsPasswordSaving(false)
            },
            onError: (ctx) => {
                toast.error(ctx.error.message)
                setIsPasswordSaving(false)
            }
        })
    }

    return (
        <MainLayout title="Account Settings">
            <div className="space-y-6 max-w-2xl mx-auto py-6">

                {/* Profile Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>
                            Manage your public profile information.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                        <CardContent className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    {...profileForm.register("email")}
                                    disabled={true}
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Email cannot be changed directly. Contact support if needed.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    {...profileForm.register("name")}
                                    placeholder="Your Name"
                                />
                                {profileForm.formState.errors.name && (
                                    <p className="text-sm text-red-500">{profileForm.formState.errors.name.message}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6">
                            <Button type="submit" disabled={isProfileSaving || !profileForm.formState.isDirty}>
                                {isProfileSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Password Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>
                            Update your password to keep your account secure.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                        <CardContent className="space-y-4 mb-6">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    {...passwordForm.register("currentPassword")}
                                />
                                {passwordForm.formState.errors.currentPassword && (
                                    <p className="text-sm text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        {...passwordForm.register("newPassword")}
                                    />
                                    {passwordForm.formState.errors.newPassword && (
                                        <p className="text-sm text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        {...passwordForm.register("confirmPassword")}
                                    />
                                    {passwordForm.formState.errors.confirmPassword && (
                                        <p className="text-sm text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t px-6">
                            <Button type="submit" disabled={isPasswordSaving}>
                                {isPasswordSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </MainLayout>
    )
}
