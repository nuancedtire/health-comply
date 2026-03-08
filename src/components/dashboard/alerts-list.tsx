import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Calendar, CheckCircle } from "lucide-react";

interface AlertItem {
    id: string;
    title: string;
    due: string;
    type: "critical" | "warning" | "info";
}

interface Props {
    alerts?: AlertItem[];
    isLoading?: boolean;
}

const DEFAULT_ALERTS: AlertItem[] = [
    { id: "1", title: "Fire Safety SOP expires", due: "Due in 12 days", type: "critical" },
    { id: "2", title: "Staff training deadline", due: "Due next week", type: "warning" },
    { id: "3", title: "New CQC Framework Update", due: "Read now", type: "info" },
];

const dotColor: Record<AlertItem["type"], string> = {
    critical: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
};

const VISIBLE_COUNT = 3;

export function AlertsList({ alerts: alertsProp, isLoading }: Props) {
    const alerts = alertsProp ?? DEFAULT_ALERTS;
    const isLiveData = alertsProp !== undefined;
    const visible = alerts.slice(0, VISIBLE_COUNT);
    const remaining = alerts.length - VISIBLE_COUNT;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Alerts & Reminders
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: VISIBLE_COUNT }).map((_, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                                <Skeleton className="mt-0.5 h-2 w-2 rounded-full shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : isLiveData && alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                        <p className="text-sm font-medium">No overdue controls</p>
                        <p className="text-xs text-muted-foreground">All scheduled controls are up to date.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visible.map((alert) => (
                            <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                                <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${dotColor[alert.type]}`} />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {alert.due}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {remaining > 0 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                                …and {remaining} more overdue control{remaining === 1 ? '' : 's'}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
