"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getSitesFn } from "@/core/functions/admin-functions"
import { authClient } from "@/lib/auth-client"

export interface Site {
    id: string
    name: string
    tenantId: string
    tenantName: string
    address?: string | null
    createdAt: Date
}

interface SiteContextType {
    sites: Site[]
    activeSite: Site | null
    siteId: string | undefined
    tenantId: string | undefined
    setActiveSite: (site: Site) => void
    isLoading: boolean
}

const SiteContext = React.createContext<SiteContextType | undefined>(undefined)

export function SiteProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = authClient.useSession()
    // Cast user to any to access tenantId if not in type yet
    const user = session?.user as any
    const tenantId = user?.tenantId as string | undefined

    const { data: sites = [], isLoading } = useQuery({
        queryKey: ['sites', tenantId],
        queryFn: () => getSitesFn({ data: { tenantId: tenantId! } }),
        enabled: !!tenantId,
    })

    // Initialize active site from localStorage or default to first site
    const [activeSiteId, setActiveSiteId] = React.useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('compass-active-site-id')
        }
        return null
    })

    const activeSite = React.useMemo(() => {
        const typedSites = sites as Site[]
        if (!typedSites || typedSites.length === 0) return null

        // Try to find the site matching the stored ID
        if (activeSiteId) {
            const found = typedSites.find((s) => s.id === activeSiteId)
            if (found) return found
        }

        // Default to first site
        return typedSites[0]
    }, [sites, activeSiteId])

    // Update localStorage when activeSite changes (or is initially set to default)
    React.useEffect(() => {
        if (activeSite && activeSite.id !== activeSiteId) {
            setActiveSiteId(activeSite.id)
            localStorage.setItem('compass-active-site-id', activeSite.id)
        }
    }, [activeSite, activeSiteId])


    const handleSetActiveSite = (site: Site) => {
        setActiveSiteId(site.id)
        localStorage.setItem('compass-active-site-id', site.id)
    }

    return (
        <SiteContext.Provider value={{
            sites: sites as Site[],
            activeSite: activeSite || null,
            siteId: activeSite?.id,
            tenantId,
            setActiveSite: handleSetActiveSite,
            isLoading
        }}>
            {children}
        </SiteContext.Provider>
    )
}

export function useSite() {
    const context = React.useContext(SiteContext)
    if (context === undefined) {
        throw new Error("useSite must be used within a SiteProvider")
    }
    return context
}
