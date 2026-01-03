import { createFileRoute } from "@tanstack/react-router";
import { useLoaderData } from "@tanstack/react-router";
import { getKeyQuestionsFn, getQualityStatementsFn } from "@/core/functions/framework";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { keyQuestions, qualityStatements } from "@/db/schema";
import { type InferSelectModel } from "drizzle-orm";

export const Route = createFileRoute("/_app/readiness/")({
    loader: async () => {
        const [kqs, statements] = await Promise.all([
            getKeyQuestionsFn(),
            getQualityStatementsFn({ data: {} })
        ]);
        return { kqs, statements };
    },
    component: ReadinessPage,
});

function ReadinessPage() {
    const { kqs, statements } = useLoaderData({ from: "/_app/readiness/" });

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Readiness Workspace</h1>
                <p className="text-muted-foreground">
                    Assess compliance against CQC Quality Statements.
                </p>
            </div>

            <Tabs defaultValue={kqs[0]?.id} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start">
                    {kqs.map((kq: InferSelectModel<typeof keyQuestions>) => (
                        <TabsTrigger key={kq.id} value={kq.id}>{kq.shortName}</TabsTrigger>
                    ))}
                </TabsList>
                {kqs.map((kq: InferSelectModel<typeof keyQuestions>) => (
                    <TabsContent key={kq.id} value={kq.id} className="flex-1 overflow-hidden mt-4">
                        <ScrollArea className="h-full pr-4">
                            <div className="grid gap-4">
                                {statements.filter((s: InferSelectModel<typeof qualityStatements>) => s.keyQuestionId === kq.id).map((stmt: InferSelectModel<typeof qualityStatements>) => (
                                    <Card key={stmt.id}>
                                        <CardHeader>
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                                    {stmt.statementNumber}
                                                </div>
                                                <CardTitle className="text-base">{stmt.statementText}</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {stmt.description || "No description avaiable."}
                                            </p>
                                            {/* Placeholder for assessment status */}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                                <span>Assessment Status:</span>
                                                <span className="font-medium text-amber-600">Not Started</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
