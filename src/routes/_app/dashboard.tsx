import { createFileRoute } from "@tanstack/react-router";
import { useLoaderData } from "@tanstack/react-router";
import { getReadinessOverviewFn } from "@/core/functions/readiness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { keyQuestions } from "@/db/schema";
import { type InferSelectModel } from "drizzle-orm";

type KeyQuestion = InferSelectModel<typeof keyQuestions>;
type ReadinessStat = KeyQuestion & {
    totalStatements: number;
    assessedCount: number;
    coveragePercent: number;
};

export const Route = createFileRoute("/_app/dashboard")({
    loader: async () => {
        // Fetch readiness stats
        return await getReadinessOverviewFn();
    },
    component: DashboardPage,
});

function DashboardPage() {
    const stats = useLoaderData({ from: "/_app/dashboard" });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Readiness Workspace</h1>
                <p className="text-muted-foreground">
                    Identify gaps and track compliance across the 5 Key Questions.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {stats.map((kq: ReadinessStat) => (
                    <Card key={kq.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {kq.fullQuestion}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Math.round(kq.coveragePercent)}%</div>
                            <p className="text-xs text-muted-foreground">
                                {kq.assessedCount} / {kq.totalStatements} statements assessed
                            </p>
                            <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${kq.coveragePercent}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Placeholder for Gaps/Actions Summary */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Open Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">No open actions.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
