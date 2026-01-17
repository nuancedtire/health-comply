import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ControlPack } from "@/core/functions/control-pack-functions";
import * as LucideIcons from "lucide-react";
import { CheckCircle2, Eye, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlPackCardProps {
    pack: ControlPack;
    isImported: boolean;
    onPreview: (packId: string) => void;
}

export function ControlPackCard({ pack, isImported, onPreview }: ControlPackCardProps) {
    // Dynamically resolve icon, fallback to LayoutList
    const IconComponent = (LucideIcons as any)[pack.packIcon] || LayoutList;

    return (
        <Card className={cn(
            "flex flex-col h-full transition-all hover:shadow-md",
            isImported ? "border-emerald-200 bg-emerald-50/10" : ""
        )}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                    <div className={cn(
                        "p-2.5 rounded-lg w-fit",
                        isImported ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
                    )}>
                        <IconComponent className="h-5 w-5" />
                    </div>
                    {isImported && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Added
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-lg leading-tight mt-3">
                    {pack.packName}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="font-normal">
                        {pack.controlCount} Controls
                    </Badge>
                    <span className="text-xs text-muted-foreground/70 capitalize">
                        {pack.keyQuestion.replace('_', '-')}
                    </span>
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                <Button 
                    variant={isImported ? "outline" : "default"} 
                    className="w-full group" 
                    onClick={() => onPreview(pack.packId)}
                >
                    {isImported ? "View Details" : "Preview & Add"}
                    <Eye className="ml-2 h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                </Button>
            </CardFooter>
        </Card>
    );
}
