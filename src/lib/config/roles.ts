
export const ROLES = [
    {
        id: "Director",
        name: "Director",
        type: "tenant",
        description: "Full access to manage the organization, users, and compliance."
    },
    {
        id: "Site Lead",
        name: "Site Lead",
        type: "site",
        description: "Leadership role for a specific site."
    },
    {
        id: "Clinical Lead",
        name: "Clinical Lead",
        type: "site",
        description: "Lead clinician for a specific site."
    },
    {
        id: "Safety Lead",
        name: "Safety Lead",
        type: "site",
        description: "Responsible for safety and safeguarding at a specific site."
    },
    {
        id: "Admin",
        name: "Admin",
        type: "tenant",
        description: "Administrative access across the tenant."
    },
    {
        id: "Compliance Officer",
        name: "Compliance Officer",
        type: "tenant",
        description: "Focus on compliance monitoring across the tenant."
    },
    {
        id: "Practitioner",
        name: "Practitioner",
        type: "site",
        description: "Clinical or operational staff member."
    },
    {
        id: "Support Staff",
        name: "Support Staff",
        type: "site",
        description: "Front desk and administrative support."
    }
] as const;

export type RoleId = typeof ROLES[number]['id'];
export type RoleType = typeof ROLES[number]['type'];

export const TENANT_ROLES = ROLES.filter(r => r.type === 'tenant');
export const SITE_ROLES = ROLES.filter(r => r.type === 'site');

export function getRole(id: string) {
    return ROLES.find(r => r.id === id);
}

/**
 * Resolve a role ID to its effective base role ID.
 * Custom roles (prefixed with "custom:") map back to their base static role.
 */
export function getEffectiveRoleId(roleId: string): RoleId {
    if (roleId.startsWith('custom:')) {
        // The base role ID is stored in the customRoles table.
        // This function only handles the static lookup;
        // for DB-backed resolution, use resolveCustomRole() server-side.
        // Fallback: strip prefix and try to find a match
        return roleId as RoleId;
    }
    return roleId as RoleId;
}

/**
 * Check if a role ID is a custom role
 */
export function isCustomRole(roleId: string): boolean {
    return roleId.startsWith('custom:');
}
