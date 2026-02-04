import { Link, useRouterState } from "@tanstack/react-router";
import {
    LayoutDashboard,
    FileText,
    CheckSquare,
    Users,
    FileCheck,
    Presentation,
    Bot,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Compliance Checklist", href: "/checklist", icon: CheckSquare },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Teams", href: "/team", icon: Users },
    { name: "Sign-Off", href: "/sign-off", icon: FileCheck },
    { name: "CQC Presentation", href: "/presentation", icon: Presentation },
];

export function AppSidebar() {
    const router = useRouterState();

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
            {/* Logo Area */}
            <div className="flex h-16 items-center border-b border-sidebar-border px-6">
                <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Bot className="h-5 w-5" />
                    </div>
                    <span>HealthComply</span>
                </Link>
            </div>

            {/* AI Assistant Button */}
            <div className="p-4">
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg">
                    <Bot className="h-5 w-5" />
                    Ask CQC AI Assistant
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-auto py-2">
                <nav className="space-y-1 px-3">
                    {navigation.map((item) => {
                        const isActive = router.location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                                )}
                            >
                                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Bottom Section */}
            <div className="mt-auto border-t border-sidebar-border p-4">
                <Link
                    to="/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                >
                    <Settings className="h-4 w-4" />
                    Practice Settings
                </Link>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
                    <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                        alt="User"
                        className="h-9 w-9 rounded-full bg-background p-1"
                    />
                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-semibold">Sarah Johnson</span>
                        <span className="truncate text-xs text-muted-foreground">Practice Manager</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
