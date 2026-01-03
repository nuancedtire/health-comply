import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const domains = [
    { name: "Safe", score: 85, color: "bg-emerald-500" },
    { name: "Effective", score: 78, color: "bg-blue-500" },
    { name: "Caring", score: 90, color: "bg-emerald-500" },
    { name: "Responsive", score: 65, color: "bg-yellow-500" },
    { name: "Well-led", score: 58, color: "bg-yellow-500" },
];

export function ComplianceProgress() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Compliance by Domain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {domains.map((domain) => (
                    <div key={domain.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{domain.name}</span>
                            <span className="text-muted-foreground">{domain.score}%</span>
                        </div>
                        <Progress value={domain.score} className="h-2" indicatorClassName={domain.color} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
