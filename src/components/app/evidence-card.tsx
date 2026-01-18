import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface EvidenceItem {
    id: string;
    title: string;
    evidenceDate: Date;
    description: string | null;
    status: string;
}

export function EvidenceCard({ item }: { item: EvidenceItem }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium leading-none">
                        {item.title}
                    </CardTitle>
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                        {item.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {item.description || "No description provided."}
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.evidenceDate).toLocaleDateString()}</span>
                    </div>
                    {/* MVP hardcoded owner for display speed */}
                    <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Admin</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/documents">View Details</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
