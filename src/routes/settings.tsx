import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "@/components/theme/theme-provider";
import { authClient } from "@/lib/auth-client";
import { getCurrentUserRoleFn } from "@/core/functions/auth-functions";
import {
  User,
  Bell,
  Palette,
  Shield,
  Monitor,
  Sun,
  Moon,
  Check,
  Laptop,
  Smartphone,
  Globe,
  LogOut,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const { data: roleData } = useQuery({
    queryKey: ["user-role-settings", session?.user?.id],
    queryFn: () => getCurrentUserRoleFn(),
    enabled: !!session?.user,
  });
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    actionReminders: true,
    evidenceUploads: false,
    complianceAlerts: true,
  });

  // Password change dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sessions dialog state
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);

  const user = session?.user;
  const userRole = roleData?.role || "User";

  // Fetch active sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["user-sessions"],
    queryFn: async () => {
      const result = await authClient.listSessions();
      return result.data || [];
    },
    enabled: sessionsDialogOpen,
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const result = await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to change password");
      }
      return result.data;
    },
    onSuccess: () => {
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
    },
    onError: (error: Error) => {
      setPasswordError(error.message);
    },
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await authClient.revokeSession({ token });
      if (result.error) {
        throw new Error(result.error.message || "Failed to revoke session");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
  });

  // Revoke all other sessions mutation
  const revokeOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.revokeOtherSessions();
      if (result.error) {
        throw new Error(result.error.message || "Failed to revoke sessions");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Globe className="w-4 h-4" />;
    if (userAgent.toLowerCase().includes("mobile")) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Laptop className="w-4 h-4" />;
  };

  const formatDate = (dateString?: Date) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleString();
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <MainLayout title="Settings">
      <div className="space-y-6 max-w-full">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and workspace settings
          </p>
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
                  defaultValue={user?.name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  defaultValue={user?.email || ""}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email
                </p>
              </div>
            </div>
            <div className="space-y-2 -mt-4">
              <Label htmlFor="role">Role</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{userRole}</Badge>
                <span className="text-sm text-muted-foreground">
                  Your assigned role in the practice
                </span>
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
                  const Icon = option.icon;
                  const isSelected = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`
                                                flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                                                ${
                                                  isSelected
                                                    ? "border-primary bg-primary/5"
                                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                }
                                            `}
                    >
                      <Icon
                        className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span
                        className={`text-sm font-medium ${isSelected ? "text-primary" : ""}`}
                      >
                        {option.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
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
                <p className="text-sm text-muted-foreground">
                  Receive a weekly summary of compliance status
                </p>
              </div>
              <Switch
                checked={notifications.emailDigest}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({
                    ...prev,
                    emailDigest: checked,
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Action Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when actions are due or overdue
                </p>
              </div>
              <Switch
                checked={notifications.actionReminders}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({
                    ...prev,
                    actionReminders: checked,
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Evidence Uploads</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when team members upload new evidence
                </p>
              </div>
              <Switch
                checked={notifications.evidenceUploads}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({
                    ...prev,
                    evidenceUploads: checked,
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compliance Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Critical alerts about compliance gaps or deadlines
                </p>
              </div>
              <Switch
                checked={notifications.complianceAlerts}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({
                    ...prev,
                    complianceAlerts: checked,
                  }))
                }
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
                <p className="text-sm text-muted-foreground">
                  Change your account password
                </p>
              </div>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
                Change Password
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Sessions</Label>
                <p className="text-sm text-muted-foreground">
                  Manage devices where you're logged in
                </p>
              </div>
              <Button variant="outline" onClick={() => setSessionsDialogOpen(true)}>
                View Sessions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to update your credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPasswordError(null);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Change Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sessions Dialog */}
      <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Active Sessions
            </DialogTitle>
            <DialogDescription>
              Manage your active sessions across all devices. Revoke sessions you don't recognize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              <>
                <div className="space-y-3">
                  {sessions.map((sessionItem) => {
                    const sessionToken = sessionItem.token;
                    const isCurrentSession = sessionToken === session?.user?.id;
                    return (
                      <div
                        key={sessionToken || sessionItem.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                           {getDeviceIcon(sessionItem.userAgent ?? undefined)}
                          <div>
                            <p className="text-sm font-medium">
                              {isCurrentSession ? "Current Session" : "Active Session"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(sessionItem.createdAt)}
                            </p>
                            {sessionItem.ipAddress && (
                              <p className="text-xs text-muted-foreground">
                                IP: {sessionItem.ipAddress}
                              </p>
                            )}
                          </div>
                        </div>
                        {!isCurrentSession && sessionToken && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeSessionMutation.mutate(sessionToken as string)}
                            disabled={revokeSessionMutation.isPending}
                          >
                            {revokeSessionMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <LogOut className="w-3 h-3 mr-1" />
                                Revoke
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {sessions.length > 1 && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => revokeOtherSessionsMutation.mutate()}
                    disabled={revokeOtherSessionsMutation.isPending}
                  >
                    {revokeOtherSessionsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4 mr-2" />
                    )}
                    Sign Out All Other Devices
                  </Button>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No active sessions found
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
