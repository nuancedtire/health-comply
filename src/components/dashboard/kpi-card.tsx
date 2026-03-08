import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string;
    description?: string;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    className?: string;
    accent?: "default" | "success" | "warning" | "danger";
}

const accentConfig = {
    default: {
        bar: "bg-primary",
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
    },
    success: {
        bar: "bg-emerald-500",
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-600",
    },
    warning: {
        bar: "bg-amber-500",
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-600",
    },
    danger: {
        bar: "bg-rose-500",
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-600",
    },
};

export function KPICard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    trendValue,
    className,
    accent = "default",
}: KPICardProps) {
    const config = accentConfig[accent];

    const TrendIcon =
        trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
    const trendColor =
        trend === "up"
            ? "text-emerald-600"
            : trend === "down"
              ? "text-rose-600"
              : "text-muted-foreground";

    return (
        <Card className={cn("overflow-hidden relative", className)}>
            {/* Left accent bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-0.5", config.bar)} />

            <CardContent className="pt-5 pb-4 pl-5 pr-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                            {title}
                        </p>
                        <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                            {value}
                        </p>
                        {(description || trendValue) && (
                            <div className="flex items-center gap-1.5 mt-2">
                                {trendValue && trend && (
                                    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", trendColor)}>
                                        <TrendIcon className="size-3" />
                                        {trendValue}
                                    </span>
                                )}
                                {description && (
                                    <span className="text-xs text-muted-foreground">
                                        {description}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={cn("p-2 rounded-lg shrink-0", config.iconBg)}>
                        <Icon className={cn("h-4 w-4", config.iconColor)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
