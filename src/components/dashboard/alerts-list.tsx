import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar } from "lucide-react";

interface AlertItem {
    id: string;
    title: string;
    due: string;
    type: "critical" | "warning" | "info";
}

const alerts: AlertItem[] = [
    { id: "1", title: "Fire Safety SOP expires", due: "Due in 12 days", type: "critical" },
    { id: "2", title: "Staff training deadline", due: "Due next week", type: "warning" },
    { id: "3", title: "New CQC Framework Update", due: "Read now", type: "info" },
];

export function AlertsList() {
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Alerts & Reminders
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                            <div className={`mt-0.5 h-2 w-2 rounded-full ${alert.type === "critical" ? "bg-red-500" :
                                alert.type === "warning" ? "bg-yellow-500" : "bg-blue-500"
                                }`} />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">{alert.title}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {alert.due}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
