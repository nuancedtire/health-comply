import { createFileRoute } from "@tanstack/react-router";
import { useLoaderData } from "@tanstack/react-router";
import { listActionsFn } from "@/core/functions/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { actions as actionsSchema } from "@/db/schema";
import { type InferSelectModel } from "drizzle-orm";

export const Route = createFileRoute("/_app/actions")({
    loader: async () => {
        return await listActionsFn();
    },
    component: ActionsPage,
});

function ActionsPage() {
    const actions = useLoaderData({ from: "/_app/actions" });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Actions & Gaps</h1>
                <p className="text-muted-foreground">
                    Track and manage compliance actions and identified gaps.
                </p>
            </div>

            <div className="grid gap-4">
                {actions.map((action: InferSelectModel<typeof actionsSchema>) => (
                    <Card key={action.id}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between">
                                <CardTitle className="text-base">{action.title}</CardTitle>
                                <Badge>{action.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                                <span>Priority: {action.priority}</span>
                                {action.dueDate && <span>Due: {new Date(action.dueDate).toLocaleDateString()}</span>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {actions.length === 0 && (
                    <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                        No actions found.
                    </div>
                )}
            </div>
        </div>
    );
}
