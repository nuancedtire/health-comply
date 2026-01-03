import { Bell, Search } from "lucide-react";

export function AppHeader() {
    return (
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            {/* Left: Practice Info */}
            <div className="flex flex-col">
                <h1 className="text-lg font-bold text-foreground">Riverside Medical Practice</h1>
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs text-muted-foreground">System Operational</span>
                </div>
            </div>

            {/* Right: Actions & status */}
            <div className="flex items-center gap-4">
                {/* Compliance Badge */}
                <div className="flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                    Compliance: 72% (Needs Attention)
                </div>

                <div className="h-6 w-px bg-border mx-2"></div>

                <button className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Search className="h-5 w-5" />
                </button>
                <button className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"></span>
                </button>
            </div>
        </header>
    );
}
