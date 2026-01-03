import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string;
    description?: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    className?: string;
}

export function KPICard({ title, value, description, icon: Icon, trend, trendValue, className }: KPICardProps) {
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {(description || trendValue) && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {trendValue && (
                            <span className={cn(
                                "font-medium mr-1",
                                trend === "up" ? "text-emerald-600" :
                                    trend === "down" ? "text-red-600" : "text-yellow-600"
                            )}>
                                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
                            </span>
                        )}
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
