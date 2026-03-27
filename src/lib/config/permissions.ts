import { ROLES, type RoleId } from "./roles";

/**
 * Permission Scopes - Visual groupings for role assignment UI
 * Each scope has a distinct color for easy identification
 */
export const PERMISSION_SCOPES = {
  users: {
    id: "users",
    label: "User Management",
    color: "#8B5CF6", // Purple
    description: "Invite, manage, and remove team members",
  },
  controls: {
    id: "controls",
    label: "Local Controls",
    color: "#F59E0B", // Amber
    description: "Create and edit compliance controls",
  },
  evidence: {
    id: "evidence",
    label: "Evidence",
    color: "#10B981", // Green
    description: "Upload and manage evidence documents",
  },
  approvals: {
    id: "approvals",
    label: "Approvals",
    color: "#EF4444", // Red
    description: "Review and approve/reject evidence",
  },
  reports: {
    id: "reports",
    label: "Reports",
    color: "#3B82F6", // Blue
    description: "Generate and view compliance reports",
  },
} as const;

export type PermissionScope = keyof typeof PERMISSION_SCOPES;

/**
 * Individual Permissions
 * - '*' means all authenticated users
 * - '__CONTROL_REVIEWER__' means dynamic check based on local control's defaultReviewerRole
 * - '__QS_OWNER__' means dynamic check based on QS ownership
 */
export const PERMISSIONS = {
  // User Management
  "users:view": {
    scope: "users" as PermissionScope,
    roles: ["Director", "Admin", "Compliance Officer", "Site Lead"] as RoleId[],
    description: "View team members and their roles",
  },
  "users:invite": {
    scope: "users" as PermissionScope,
    roles: ["Director", "Admin"] as RoleId[],
    description: "Invite new team members",
  },
  "users:edit": {
    scope: "users" as PermissionScope,
    roles: ["Director", "Admin"] as RoleId[],
    description: "Edit user details and roles",
  },
  "users:delete": {
    scope: "users" as PermissionScope,
    roles: ["Director"] as RoleId[],
    description: "Remove team members",
  },

  // Local Controls
  "controls:view": {
    scope: "controls" as PermissionScope,
    roles: ["*"] as const, // All authenticated users
    description: "View local controls and their status",
  },
  "controls:create": {
    scope: "controls" as PermissionScope,
    roles: ["Director", "Admin", "Compliance Officer"] as RoleId[],
    description: "Create new local controls",
  },
  "controls:edit": {
    scope: "controls" as PermissionScope,
    roles: ["Director", "Admin", "Compliance Officer"] as RoleId[],
    description: "Edit existing local controls",
  },
  "controls:delete": {
    scope: "controls" as PermissionScope,
    roles: ["Director", "Admin"] as RoleId[],
    description: "Delete local controls",
  },

  // Evidence
  "evidence:view": {
    scope: "evidence" as PermissionScope,
    roles: ["*"] as const,
    description: "View evidence documents",
  },
  "evidence:upload": {
    scope: "evidence" as PermissionScope,
    roles: ["*"] as const, // Anyone can upload
    description: "Upload new evidence",
  },
  "evidence:edit": {
    scope: "evidence" as PermissionScope,
    roles: ["Director", "Admin", "Compliance Officer", "Clinical Lead"] as RoleId[],
    description: "Edit evidence metadata",
  },
  "evidence:delete": {
    scope: "evidence" as PermissionScope,
    roles: ["Director", "Admin"] as RoleId[],
    description: "Delete evidence documents",
  },

  // Approvals - Special dynamic permission
  "evidence:approve": {
    scope: "approvals" as PermissionScope,
    roles: ["__CONTROL_REVIEWER__"] as const, // Dynamic: based on local control's defaultReviewerRole
    description: "Approve or reject evidence (requires reviewer role for the control)",
  },
  "evidence:submit_for_review": {
    scope: "evidence" as PermissionScope,
    roles: ["*"] as const, // Uploader can submit their own drafts
    description: "Submit draft evidence for review",
  },

  // Reports
  "reports:view": {
    scope: "reports" as PermissionScope,
    roles: ["Director", "Admin", "Compliance Officer", "Site Lead"] as RoleId[],
    description: "View compliance reports",
  },
  "reports:generate": {
    scope: "reports" as PermissionScope,
    roles: ["Director", "Admin", "Compliance Officer"] as RoleId[],
    description: "Generate new inspection packs",
  },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Get all permission scopes that a role has access to
 */
export function getRoleScopes(roleId: RoleId): PermissionScope[] {
  const scopes = new Set<PermissionScope>();

  for (const [_, permission] of Object.entries(PERMISSIONS)) {
    const roles = permission.roles as readonly string[];
    if (roles.includes("*") || roles.includes(roleId)) {
      scopes.add(permission.scope);
    }
  }

  return Array.from(scopes);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(roleId: RoleId): PermissionKey[] {
  const permissions: PermissionKey[] = [];

  for (const [key, permission] of Object.entries(PERMISSIONS)) {
    const roles = permission.roles as readonly string[];
    if (roles.includes("*") || roles.includes(roleId)) {
      permissions.push(key as PermissionKey);
    }
  }

  return permissions;
}

/**
 * Check if a role has a specific permission (static check only)
 * For dynamic permissions like __CONTROL_REVIEWER__, use the appropriate helper
 */
export function hasStaticPermission(roleId: RoleId, permission: PermissionKey): boolean {
  const config = PERMISSIONS[permission];
  const roles = config.roles as readonly string[];

  if (roles.includes("*")) return true;
  if (roles.includes("__CONTROL_REVIEWER__") || roles.includes("__QS_OWNER__")) {
    // Dynamic permissions require context - return false for static check
    return false;
  }

  return roles.includes(roleId);
}

/**
 * Get visual representation of role capabilities for UI
 */
export function getRoleScopesWithColors(roleId: RoleId) {
  const scopes = getRoleScopes(roleId);
  return scopes.map((scopeId) => ({
    ...PERMISSION_SCOPES[scopeId],
    id: scopeId,
  }));
}

/**
 * Get all roles that have a specific permission
 */
export function getRolesWithPermission(permission: PermissionKey): RoleId[] {
  const config = PERMISSIONS[permission];
  const roles = config.roles as readonly string[];

  if (roles.includes("*")) {
    return ROLES.map((r) => r.id);
  }

  return roles.filter(
    (r) => r !== "__CONTROL_REVIEWER__" && r !== "__QS_OWNER__"
  ) as RoleId[];
}
