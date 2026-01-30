import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/components/theme/theme-provider'
import {
    User, Bell, Palette, Shield, Monitor, Sun, Moon, Check, Bot, Loader2,
    Laptop, Smartphone, Globe, X
} from 'lucide-react'
import {
    getUserPreferencesFn, updateAIModelFn, getUserSessionsFn, revokeSessionFn,
    updateProfileFn, AI_MODELS
} from '@/core/functions/settings-functions'
import { getCurrentUserRoleFn } from '@/core/functions/auth-functions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export const Route = createFileRoute('/settings')({
    beforeLoad: ({ context }) => {
        if (!context.user) {
            throw redirect({
                to: '/login',
            })
        }
    },
    component: SettingsPage,
})

function SettingsPage() {
    const { user } = Route.useRouteContext()
    const { theme, setTheme } = useTheme()
    const queryClient = useQueryClient()

    const [name, setName] = useState(user?.name || '')
    const [showSessions, setShowSessions] = useState(false)
    const [notifications, setNotifications] = useState({
        emailDigest: true,
        actionReminders: true,
        evidenceUploads: false,
        complianceAlerts: true,
    })

    // Fetch user role
    const { data: roleData } = useQuery({
        queryKey: ['currentUserRole'],
        queryFn: () => getCurrentUserRoleFn(),
    })

    // Fetch preferences
    const { data: preferences, isLoading: prefsLoading } = useQuery({
        queryKey: ['userPreferences'],
        queryFn: () => getUserPreferencesFn(),
    })

    // Fetch sessions
    const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
        queryKey: ['userSessions'],
        queryFn: () => getUserSessionsFn(),
        enabled: showSessions,
    })

    // Mutations
    const updateProfileMutation = useMutation({
        mutationFn: (name: string) => updateProfileFn({ data: { name } }),
        onSuccess: () => {
            toast.success('Profile updated successfully')
            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
        },
        onError: (err: any) => toast.error(err.message || 'Failed to update profile')
    })

    const updateModelMutation = useMutation({
        mutationFn: (aiModel: string) => updateAIModelFn({ data: { aiModel } }),
        onSuccess: () => {
            toast.success('AI model updated successfully')
            queryClient.invalidateQueries({ queryKey: ['userPreferences'] })
        },
        onError: (err: any) => toast.error(err.message || 'Failed to update model')
    })

    const revokeSessionMutation = useMutation({
        mutationFn: (sessionId: string) => revokeSessionFn({ data: { sessionId } }),
        onSuccess: () => {
            toast.success('Session revoked')
            refetchSessions()
        },
        onError: (err: any) => toast.error(err.message || 'Failed to revoke session')
    })

    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ] as const

    const getDeviceIcon = (userAgent: string | null) => {
        if (!userAgent) return Globe
        if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
            return Smartphone
        }
        return Laptop
    }

    const formatDate = (date: Date | null) => {
        if (!date) return 'Unknown'
        return new Date(date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const parseUserAgent = (userAgent: string | null) => {
        if (!userAgent) return 'Unknown device'
        // Simple browser detection
        if (userAgent.includes('Chrome')) return 'Chrome'
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Safari')) return 'Safari'
        if (userAgent.includes('Edge')) return 'Edge'
        return 'Browser'
    }

    return (
        <MainLayout title="Settings">
            <div className="space-y-6 max-w-4xl">
                <div className="border-b pb-4">
                    <h1 className="text-3xl font-bold mb-1">Settings</h1>
                    <p className="text-muted-foreground">Manage your account preferences and workspace settings</p>
                </div>

                {/* Profile Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Profile
                        </CardTitle>
                        <CardDescription>
                            Manage your personal information and account details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Display Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">Contact support to change your email</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{roleData?.role || 'User'}</Badge>
                                {roleData?.type === 'tenant' && (
                                    <span className="text-sm text-muted-foreground">Full access across the organization</span>
                                )}
                                {roleData?.type === 'site' && (
                                    <span className="text-sm text-muted-foreground">Access limited to assigned site</span>
                                )}
                            </div>
                        </div>
                        <div className="pt-2">
                            <Button
                                onClick={() => updateProfileMutation.mutate(name)}
                                disabled={updateProfileMutation.isPending || name === user?.name}
                            >
                                {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Model Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            AI Assistant
                        </CardTitle>
                        <CardDescription>
                            Choose which AI model powers your compliance assistant
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <Label>AI Model</Label>
                            {prefsLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading preferences...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {AI_MODELS.map((model) => {
                                        const isSelected = preferences?.aiModel === model.id
                                        return (
                                            <button
                                                key={model.id}
                                                onClick={() => updateModelMutation.mutate(model.id)}
                                                disabled={updateModelMutation.isPending}
                                                className={`
                                                    flex flex-col items-start gap-1 p-4 rounded-lg border-2 transition-all text-left
                                                    ${isSelected
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                    }
                                                    disabled:opacity-50
                                                `}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                                                        {model.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                                                </div>
                                                <span className="text-xs text-muted-foreground">{model.provider}</span>
                                                <span className="text-xs text-muted-foreground">{model.description}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5" />
                            Appearance
                        </CardTitle>
                        <CardDescription>
                            Customize how the application looks
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <Label>Theme</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {themeOptions.map((option) => {
                                    const Icon = option.icon
                                    const isSelected = theme === option.value
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => setTheme(option.value)}
                                            className={`
                                                flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                                                ${isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                }
                                            `}
                                        >
                                            <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                                                {option.label}
                                            </span>
                                            {isSelected && (
                                                <Check className="w-4 h-4 text-primary" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                        </CardTitle>
                        <CardDescription>
                            Configure how and when you receive notifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Weekly Email Digest</Label>
                                <p className="text-sm text-muted-foreground">Receive a weekly summary of compliance status</p>
                            </div>
                            <Switch
                                checked={notifications.emailDigest}
                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailDigest: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Action Reminders</Label>
                                <p className="text-sm text-muted-foreground">Get notified when actions are due or overdue</p>
                            </div>
                            <Switch
                                checked={notifications.actionReminders}
                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, actionReminders: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Evidence Uploads</Label>
                                <p className="text-sm text-muted-foreground">Notify when team members upload new evidence</p>
                            </div>
                            <Switch
                                checked={notifications.evidenceUploads}
                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, evidenceUploads: checked }))}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Compliance Alerts</Label>
                                <p className="text-sm text-muted-foreground">Critical alerts about compliance gaps or deadlines</p>
                            </div>
                            <Switch
                                checked={notifications.complianceAlerts}
                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, complianceAlerts: checked }))}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Security
                        </CardTitle>
                        <CardDescription>
                            Manage your account security settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Password</Label>
                                <p className="text-sm text-muted-foreground">Change your account password</p>
                            </div>
                            <Button variant="outline">Change Password</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Active Sessions</Label>
                                <p className="text-sm text-muted-foreground">Manage devices where you're logged in</p>
                            </div>
                            <Button variant="outline" onClick={() => setShowSessions(true)}>
                                View Sessions
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sessions Dialog */}
            <Dialog open={showSessions} onOpenChange={setShowSessions}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Active Sessions</DialogTitle>
                        <DialogDescription>
                            These are the devices currently logged into your account
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {sessionsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : sessions && sessions.length > 0 ? (
                            sessions.map((session) => {
                                const DeviceIcon = getDeviceIcon(session.userAgent)
                                return (
                                    <div
                                        key={session.id}
                                        className={`flex items-start justify-between p-3 rounded-lg border ${session.isCurrent ? 'border-primary bg-primary/5' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <DeviceIcon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">
                                                        {parseUserAgent(session.userAgent)}
                                                    </span>
                                                    {session.isCurrent && (
                                                        <Badge variant="secondary" className="text-xs">Current</Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {session.ipAddress || 'Unknown IP'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Created: {formatDate(session.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        {!session.isCurrent && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => revokeSessionMutation.mutate(session.id)}
                                                disabled={revokeSessionMutation.isPending}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No active sessions found</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    )
}
