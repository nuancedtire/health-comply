import { Link } from "@tanstack/react-router";
import { LayoutDashboard, FileText, CheckCircle, AlertTriangle } from "lucide-react";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Evidence Locker", href: "/evidence", icon: FileText },
    { name: "Readiness Workspace", href: "/readiness", icon: CheckCircle },
    { name: "Actions & Gaps", href: "/actions", icon: AlertTriangle },
];

export function AppSidebar() {
    return (
        <div className="flex h-screen w-64 flex-col border-r bg-muted/40 pb-4">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link to="/" className="flex items-center gap-2 font-semibold">
                    <CheckCircle className="h-6 w-6" />
                    <span className="">HealthComply</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navigation.map((item) => (
                        <Link
                            key={item.href}
                            to={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary [&.active]:bg-muted [&.active]:text-primary"
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="mt-auto p-4 border-t">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-xs font-bold">AD</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Admin User</span>
                        <span className="text-xs text-muted-foreground">Practice Manager</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
