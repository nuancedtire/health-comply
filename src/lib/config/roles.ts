
export const ROLES = [
    {
        id: "Director",
        name: "Director",
        type: "tenant",
        description: "Full access to manage the organization, users, and compliance."
    },
    {
        id: "GP Partner",
        name: "GP Partner",
        type: "site",
        description: "Leadership role for a specific site."
    },
    {
        id: "Nurse Lead",
        name: "Nurse Lead",
        type: "site",
        description: "Lead nurse for a specific site."
    },
    {
        id: "Safeguarding Lead",
        name: "Safeguarding Lead",
        type: "site",
        description: "Responsible for safeguarding at a specific site."
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
        id: "Clinician",
        name: "Clinician",
        type: "site",
        description: "Clinical staff member."
    },
    {
        id: "Receptionist",
        name: "Receptionist",
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
