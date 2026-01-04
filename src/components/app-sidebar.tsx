import { Home, FileText, CheckSquare, ShieldCheck, LogOut, Settings } from "lucide-react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "@tanstack/react-router"

// Menu items.
const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
    },
    {
        title: "Evidence Locker",
        url: "/evidence",
        icon: FileText,
    },
    {
        title: "Action Plans",
        url: "/actions",
        icon: CheckSquare,
    },
    {
        title: "Readiness",
        url: "/readiness",
        icon: ShieldCheck,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
    {
        title: "Debug Console",
        url: "/admin/debug",
        icon: ShieldCheck,
    },
    {
        title: "Tenants",
        url: "/admin/tenants",
        icon: Home, // Using Home icon for tenants/orgs for now
    },
    {
        title: "Invite Users",
        url: "/admin/users",
        icon: FileText,
    }
]

export function AppSidebar() {
    const router = useRouter()

    const handleLogout = async () => {
        // Client-side logout via better-auth
        await authClient.signOut()
        router.invalidate()
        await router.navigate({ to: '/login' })
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b p-4">
                <h2 className="text-lg font-semibold tracking-tight">Health Comply</h2>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                            <LogOut />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
