"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getCurrentUserRoleFn } from "@/core/functions/auth-functions"
import {
  Home,
  FileText,
  CheckSquare,
  ShieldCheck,
  Settings,
  Users,
  FileCheck,
  Presentation,
  Building,
  UserPlus,
  ClipboardList,
} from "lucide-react"
import { Link, useRouter } from "@tanstack/react-router"
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
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Compliance Checklist",
    url: "/checklist",
    icon: CheckSquare,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
  },
  {
    title: "Teams",
    url: "/team",
    icon: Users,
  },
  {
    title: "Sign-Off",
    url: "/signoff",
    icon: FileCheck,
  },
  {
    title: "CQC Presentation",
    url: "/presentation",
    icon: Presentation,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Debug",
    url: "/admin/debug",
    icon: ShieldCheck,
  },
  {
    title: "Tenants",
    url: "/admin/tenants",
    icon: Building,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: UserPlus,
  },
  {
    title: "Audit Log",
    url: "/admin/audit",
    icon: ClipboardList,
  }
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  // Logic:
  // If isSystemAdmin (Superadmin): Show ONLY Debug, Tenants, Users, Settings.
  // Else (Practice Manager/User): Show Dashboard, Checklist, Documents, Team, Sign-off, Presentation, Settings, Tenants.

  // Explicitly cast user to allow access to custom fields not yet in client type
  const isSystemAdmin = (session?.user as any)?.isSystemAdmin;

  const filteredItems = items.filter(item => {
    // List of strict superadmin-only items
    const superAdminItems = ["Debug", "Tenants", "Users", "Audit Log"];

    if (isSystemAdmin) {
      return ["Debug", "Tenants", "Users", "Audit Log"].includes(item.title);
    } else {
      // Standard/Practice Manager view: 
      // MUST NOT include superAdminItems
      return !superAdminItems.includes(item.title);
    }
  });

  const handleLogout = async () => {
    await authClient.signOut()
    router.invalidate()
    await router.navigate({ to: '/login' })
  }

  // Fetch current user role
  const { data: roleData } = useQuery({
    queryKey: ['user-role', session?.user?.id],
    queryFn: () => getCurrentUserRoleFn(),
    enabled: !!session?.user
  });

  const userData = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
    role: roleData?.role || (session as any)?.role || (isSystemAdmin ? "Super Admin" : "User")
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link to={item.url} activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onLogout={handleLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
