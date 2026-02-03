import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface MainLayoutProps {
    children: React.ReactNode
    title?: string
}

import { Route as RootRoute } from '@/routes/__root'

export function MainLayout({ children, title = "Compass" }: MainLayoutProps) {
    const { uiSettings } = RootRoute.useRouteContext()

    return (
        <SidebarProvider defaultOpen={uiSettings.sidebarOpen}>
            <AppSidebar />
            <main className="flex-1 overflow-hidden h-screen flex flex-col bg-background">
                <header className="flex h-14 shrink-0 items-center gap-2 border-b-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                {title !== "Compass" && (
                                    <>
                                        <BreadcrumbSeparator className="hidden md:block" />
                                        <BreadcrumbItem>
                                            <BreadcrumbPage className="font-semibold">{title}</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </>
                                )}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-6 bg-muted/30">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}
