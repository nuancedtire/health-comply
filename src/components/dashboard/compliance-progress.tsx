import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DomainScore {
    name: string;
    score: number;
    coveredQs?: number;
    totalQs?: number;
}

interface Props {
    domains?: DomainScore[];
    isLoading?: boolean;
}

const DEFAULT_DOMAINS: DomainScore[] = [
    { name: "Safe", score: 0 },
    { name: "Effective", score: 0 },
    { name: "Caring", score: 0 },
    { name: "Responsive", score: 0 },
    { name: "Well-led", score: 0 },
];

function getStatus(score: number) {
    if (score >= 80) return { label: "Good", dot: "bg-emerald-500", text: "text-emerald-600", bar: "bg-emerald-500" };
    if (score >= 50) return { label: "Fair", dot: "bg-amber-500", text: "text-amber-600", bar: "bg-amber-500" };
    return { label: "Needs work", dot: "bg-rose-500", text: "text-rose-600", bar: "bg-rose-500" };
}

export function ComplianceProgress({ domains: domainsProp, isLoading }: Props) {
    const domains = domainsProp ?? DEFAULT_DOMAINS;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Compliance by Domain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-2 w-2 rounded-full shrink-0" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-12 ml-auto" />
                                <Skeleton className="h-4 w-8" />
                            </div>
                            <Skeleton className="h-1.5 w-full" />
                        </div>
                    ))
                    : domains.map((domain) => {
                        const s = getStatus(domain.score);
                        return (
                            <div key={domain.name} className="space-y-1.5">
                                <div className="flex items-center gap-2 text-sm">
                                    <div className={cn("h-2 w-2 rounded-full shrink-0", s.dot)} />
                                    <span className="font-medium">{domain.name}</span>
                                    {domain.coveredQs !== undefined && domain.totalQs !== undefined && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                            {domain.coveredQs}/{domain.totalQs} stmts
                                        </span>
                                    )}
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <span className={cn("text-xs font-medium", s.text)}>{s.label}</span>
                                        <span className="font-semibold tabular-nums w-9 text-right">{domain.score}%</span>
                                    </div>
                                </div>
                                <Progress value={domain.score} className="h-1.5" indicatorClassName={s.bar} />
                            </div>
                        );
                    })}
            </CardContent>
        </Card>
    );
}
