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
import { User, Bell, Palette, Shield, Monitor, Sun, Moon, Check } from 'lucide-react'

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
    const { theme, setTheme } = useTheme()
    const [notifications, setNotifications] = useState({
        emailDigest: true,
        actionReminders: true,
        evidenceUploads: false,
        complianceAlerts: true,
    })

    const themeOptions = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor },
    ] as const

    return (
        <MainLayout title="Settings">
            <div className="space-y-6 max-w-full">
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
                                <Input id="name" placeholder="Your name" defaultValue="Practice Manager" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" placeholder="you@example.com" defaultValue="admin@practice.nhs.uk" disabled />
                                <p className="text-xs text-muted-foreground">Contact support to change your email</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">Practice Manager</Badge>
                                <span className="text-sm text-muted-foreground">Full access to manage the practice</span>
                            </div>
                        </div>
                        <div className="pt-2">
                            <Button>Save Changes</Button>
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
                                <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                            </div>
                            <Button variant="outline">Change Password</Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Active Sessions</Label>
                                <p className="text-sm text-muted-foreground">Manage devices where you're logged in</p>
                            </div>
                            <Button variant="outline">View Sessions</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
