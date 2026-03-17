import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function ResendStatusAlert({
    configured,
    title = "Automatic email delivery is unavailable",
    description,
    className,
}: {
    configured?: boolean;
    title?: string;
    description: string;
    className?: string;
}) {
    if (configured) {
        return null;
    }

    return (
        <Alert
            className={cn(
                "border-amber-300 bg-amber-50/90 text-amber-950 [&>svg]:text-amber-700 *:data-[slot=alert-description]:text-amber-900/80",
                className
            )}
        >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{description}</AlertDescription>
        </Alert>
    );
}
