import { ChevronsUpDown, Plus, LayoutGrid } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQuery } from "@tanstack/react-query"
import { getCurrentUserRoleFn } from "@/core/functions/auth-functions"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useSite } from "@/components/site-context"
import { useRouter } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"
import { CompassLogo } from "@/components/compass-logo"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { sites, activeSite, setActiveSite, isLoading } = useSite()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const isSystemAdmin = (session?.user as any)?.isSystemAdmin

  // Fetch current user role
  const { data: roleData } = useQuery({
    queryKey: ['user-role-switcher', session?.user?.id],
    queryFn: () => getCurrentUserRoleFn(),
    enabled: !!session?.user
  });

  const userRole = roleData?.role || (session as any)?.role || "User";
  const roleType = roleData?.type || "site";

  // Can switch sites if System Admin OR Tenant-scoped role (Practice Manager, Compliance Officer, etc.)
  const canSwitchSites = isSystemAdmin || roleType === 'tenant';

  // Can CREATE sites only if System Admin or Practice Manager
  const canCreateSites = isSystemAdmin || userRole === "Practice Manager";

  if (isSystemAdmin) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent/50">
            <div className="bg-primary/10 text-primary flex aspect-square size-8 items-center justify-center rounded-lg">
              <CompassLogo className="size-5" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">System Admin</span>
              <span className="truncate text-xs">Console</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (isLoading) {
    return (
      <SidebarMenuButton size="lg" className="animate-pulse">
        <div className="bg-sidebar-primary/20 aspect-square size-8 rounded-lg" />
        <div className="h-4 w-20 rounded bg-sidebar-primary/20" />
      </SidebarMenuButton>
    )
  }

  // If no sites, show placeholder or prompt
  if (!activeSite) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => canCreateSites && router.navigate({ to: '/create-site' })}
            className={!canCreateSites ? "opacity-50 cursor-not-allowed" : ""}
            disabled={!canCreateSites}
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Create Site</span>
              <span className="truncate text-xs">No sites found</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!canSwitchSites}>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground disabled:opacity-100"
            >
              <div className="">
                <CompassLogo className="size-8" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeSite.name}</span>
                <span className="truncate text-xs">{activeSite.tenantName}</span>
              </div>
              {canSwitchSites && <ChevronsUpDown className="ml-auto" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {canSwitchSites && (
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Sites
              </DropdownMenuLabel>
              {sites.map((site) => (
                <DropdownMenuItem
                  key={site.id}
                  onClick={() => setActiveSite(site)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <LayoutGrid className="size-3.5 shrink-0" />
                  </div>
                  {site.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {canCreateSites && (
                <DropdownMenuItem className="gap-2 p-2" onClick={() => router.navigate({ to: '/create-site' })}>
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">Add site</div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
