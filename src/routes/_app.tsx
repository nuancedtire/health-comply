import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/header";

export const Route = createFileRoute("/_app")({
    component: AppLayout,
});

function AppLayout() {
    return (
        <div className="flex h-screen w-full bg-muted/40 font-sans">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <AppHeader />
                <main className="flex-1 overflow-auto p-4 lg:p-6 bg-muted/20">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
