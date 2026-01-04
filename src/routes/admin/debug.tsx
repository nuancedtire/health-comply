import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { seedDatabaseFn, resetDatabaseFn, seedCqcTaxonomyFn, resetCqcTaxonomyFn } from '@/core/functions/seed-functions'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/admin/debug')({
    component: AdminDebugComponent,
})

function AdminDebugComponent() {
    const { data: session, isPending } = authClient.useSession()

    // All hooks must be called before any conditional returns
    const [result, setResult] = useState<any>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetConfirmation, setResetConfirmation] = useState("");

    const seedCqcMutation = useMutation({
        mutationFn: () => seedCqcTaxonomyFn(),
        onSuccess: (data: any) => {
            const { summary } = data;
            setResult({
                type: 'success',
                message: `CQC Taxonomy seeded successfully! (${summary.evidenceCategories} categories, ${summary.keyQuestions} key questions, ${summary.qualityStatements} quality statements)`,
                details: data.results
            });
            toast.success("CQC Taxonomy seeded successfully");
        },
        onError: (err) => {
            setResult({ type: 'error', message: err.message });
            toast.error("Failed to seed CQC taxonomy");
        }
    });

    const seedMutation = useMutation({
        mutationFn: () => seedDatabaseFn(),
        onSuccess: (data: any) => {
            setResult({ type: 'success', message: 'Database seeded successfully!', details: data.results });
            toast.success("Database seeded successfully");
        },
        onError: (err) => {
            setResult({ type: 'error', message: err.message });
            toast.error("Failed to seed database");
        }
    });

    const resetCqcMutation = useMutation({
        mutationFn: () => resetCqcTaxonomyFn(),
        onSuccess: (data: any) => {
            setResult({ type: 'success', message: data.message });
            toast.success("CQC Taxonomy reset successfully");
        },
        onError: (err) => {
            setResult({ type: 'error', message: err.message });
            toast.error("Failed to reset CQC taxonomy");
        }
    });

    const resetMutation = useMutation({
        mutationFn: () => resetDatabaseFn(),
        onSuccess: (data: any) => {
            const cqcMsg = data.cqcReset ? " CQC Taxonomy was also reset." : " CQC Taxonomy was NOT reset (check logs).";
            setResult({ type: 'success', message: `Database reset successfully! Deleted ${data.deletedCount} tenants.${cqcMsg}` });
            setResetDialogOpen(false);
            setResetConfirmation("");
            toast.success(`Database reset complete`);
        },
        onError: (err) => {
            setResult({ type: 'error', message: err.message });
            toast.error("Failed to reset database");
        }
    });

    const handleReset = () => {
        if (resetConfirmation === "RESET") {
            resetMutation.mutate();
        }
    };

    // Now conditional returns are safe
    if (isPending) {
        return <div className="p-8">Loading session...</div>
    }

    if (!session) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                <p>You must be logged in to view this page.</p>
                <Button asChild className="mt-4">
                    <Link to="/login">Login</Link>
                </Button>
            </div>
        )
    }

    const user = session.user as any // Cast because updated schema might not be fully inferred in client types yet

    return (
        <div className="px-3 space-y-6 py-0">
            <h1 className="text-3xl font-bold">Admin / Debug Console</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Current User Info</CardTitle>
                    <CardDescription>Details about your current session and permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="font-semibold">User ID</p>
                            <p className="font-mono text-sm bg-muted p-1 rounded">{user.id}</p>
                        </div>
                        <div>
                            <p className="font-semibold">Email</p>
                            <p>{user.email}</p>
                        </div>
                        <div>
                            <p className="font-semibold">System Admin</p>
                            <Badge variant={user.isSystemAdmin ? "default" : "secondary"}>
                                {user.isSystemAdmin ? "YES" : "NO"}
                            </Badge>
                        </div>
                        <div>
                            <p className="font-semibold">Tenant ID</p>
                            <p className="font-mono text-sm">{user.tenantId || "None"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {user.isSystemAdmin && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Seeding</CardTitle>
                            <CardDescription>Manage test data for development. Warning: Reset is destructive.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex gap-4 flex-wrap">
                                <Button
                                    onClick={() => seedCqcMutation.mutate()}
                                    disabled={seedCqcMutation.isPending || seedMutation.isPending || resetMutation.isPending}
                                    variant="outline"
                                >
                                    {seedCqcMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Seed CQC Taxonomy
                                </Button>
                                <Button
                                    onClick={() => resetCqcMutation.mutate()}
                                    disabled={seedCqcMutation.isPending || seedMutation.isPending || resetMutation.isPending || resetCqcMutation.isPending}
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    {resetCqcMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset CQC
                                </Button>
                                <Button
                                    onClick={() => seedMutation.mutate()}
                                    disabled={seedCqcMutation.isPending || seedMutation.isPending || resetMutation.isPending}
                                >
                                    {seedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Seed Database
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => setResetDialogOpen(true)}
                                    disabled={seedCqcMutation.isPending || seedMutation.isPending || resetMutation.isPending}
                                >
                                    {resetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reset Database
                                </Button>
                            </div>

                            {result && (
                                <div className={`p-4 rounded-md border text-sm ${result.type === 'error' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-green-50 text-green-900 border-green-200'
                                    }`}>
                                    <p className="font-bold">{result.message}</p>
                                    {result.details && (
                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                            {result.details.map((msg: string, i: number) => (
                                                <li key={i}>{msg}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>System Management</CardTitle>
                            <CardDescription>Global actions for System Admins</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                            <Button variant="outline">Manage Tenants (Coming Soon)</Button>
                            <Button variant="outline">Global User List (Coming Soon)</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Database</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reset the database? This will delete <span className="text-red-500 font-bold">ALL</span> tenants (except basic structure of your own) and <span className="text-red-500 font-bold">ALL</span> CQC Taxonomy data.
                            <br /><br />
                            Your account, tenant, and sites will be preserved, but all operational data (Evidence, Policies, Actions, etc.) will be wiped.
                            <br /><br />
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Label>Type <span className="font-mono font-bold">RESET</span> to confirm:</Label>
                        <Input
                            value={resetConfirmation}
                            onChange={(e) => setResetConfirmation(e.target.value)}
                            placeholder="RESET"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                            disabled={resetConfirmation !== "RESET" || resetMutation.isPending}
                        >
                            {resetMutation.isPending ? "Resetting..." : "Confirm Reset"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    )
}
