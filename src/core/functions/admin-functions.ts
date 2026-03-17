import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { logUserEvent, AUDIT_ACTIONS } from "@/lib/audit";
import { ROLES, getRole } from "@/lib/config/roles";
import {
    buildInvitationUrl,
    buildPasswordResetUrl,
    sendInvitationEmail,
    sendPasswordResetEmail,
} from "@/lib/email";

// Admin functions are protected by authMiddleware
// Middleware provides: user, session, db

// Authorization helper functions
async function requireSystemAdmin(user: any): Promise<void> {
    if (user.isSystemAdmin) {
        return;
    }
    throw new Error("Unauthorized: System admin access required");
}

const CreateTenantSchema = z.object({
    name: z.string(),
    slug: z.string().optional()
});

export const createTenantFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof CreateTenantSchema>) => CreateTenantSchema.parse(data))
    .handler(async (ctx) => {
        const { name } = ctx.data;
        const { db, user } = ctx.context;

        // Authorization: Only system admins can create tenants
        await requireSystemAdmin(user);

        // Create Tenant
        const tenantId = `t_${crypto.randomUUID().split('-')[0]}`;

        await db.insert(schema.tenants as any).values({
            id: tenantId,
            name: name,
            createdAt: new Date(),
        });

        // Audit log
        await logUserEvent(db, {
            tenantId,
            actorUserId: user.id,
            action: AUDIT_ACTIONS.TENANT_CREATED,
            details: { tenantName: name },
        });

        return { tenantId };
    });

const InviteUserSchema = z.object({
    email: z.string().email(),
    tenantId: z.string(),
    siteId: z.string().optional(),
    role: z.string()
});

export const inviteUserFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof InviteUserSchema>) => InviteUserSchema.parse(data))
    .handler(async (ctx) => {
        const data = ctx.data;
        const { db, user } = ctx.context;
        const appUrl = (ctx.context.env as any)?.BETTER_AUTH_URL as string | undefined;

        // Validate Role exists in config
        const targetRoleConfig = getRole(data.role);
        if (!targetRoleConfig) {
            throw new Error("Invalid role specified.");
        }

        // 1. Authorization Check
        if (!(user as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                // roleType come from config now, but let's just get the role name
                tenantId: schema.users.tenantId, // schema.roles.tenantId is gone. User has tenantId.
                siteId: schema.userRoles.siteId
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, user.id));

            const myRole = userRoles[0];
            if (!myRole) throw new Error("Unauthorized");

            const myRoleConfig = getRole(myRole.roleName);

            // Enforce Role-Based Permission (Who can invite?)
            const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer", "GP Partner"];
            if (!allowedRoles.includes(myRole.roleName)) {
                throw new Error("Unauthorized: Your role does not have permission to invite users.");
            }

            // Enforce Tenant
            if (data.tenantId !== myRole.tenantId) {
                throw new Error("Unauthorized: Cannot invite to a different tenant.");
            }

            // Enforce Site (if site-scoped role)
            if (myRoleConfig?.type === 'site') {
                if (!myRole.siteId) throw new Error("Unauthorized: Site-scoped role without site assignment.");
                if (data.siteId !== myRole.siteId) {
                    throw new Error("Unauthorized: Can only invite to your assigned site.");
                }
            }
        }

        // Check for existing pending invitation
        const existingInvite = await db.select()
            .from(schema.invitations as any)
            .where(
                and(
                    eq(schema.invitations.email, data.email) as any,
                    eq(schema.invitations.tenantId, data.tenantId) as any,
                    eq(schema.invitations.status, 'pending') as any
                )
            )
            .limit(1);

        if (existingInvite.length > 0) {
            throw new Error("An active invitation already exists for this email.");
        }

        const token = crypto.randomUUID();
        const inviteId = `inv_${crypto.randomUUID()}`;

        await db.insert(schema.invitations as any).values({
            id: inviteId,
            email: data.email,
            tenantId: data.tenantId,
            siteId: data.siteId,
            role: data.role,
            token,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
            status: 'pending',
            invitedBy: user.id,
            createdAt: new Date(),
        });

        // Audit log
        await logUserEvent(db, {
            tenantId: data.tenantId,
            actorUserId: user.id,
            targetUserId: inviteId, // Use invite ID since user doesn't exist yet
            action: AUDIT_ACTIONS.USER_INVITED,
            details: {
                targetUserEmail: data.email,
                newRole: data.role,
            },
        });

        const inviteUrl = buildInvitationUrl(appUrl, token);
        const resendApiKey = (ctx.context.env as any)?.RESEND_API_KEY as string | undefined;
        const emailDelivery = {
            configured: Boolean(resendApiKey),
            sent: false,
            error: null as string | null,
            inviteUrl,
        };

        if (resendApiKey) {
            try {
                // Fetch tenant name and site name for the email
                const tenant = await db.select({ name: schema.tenants.name })
                    .from(schema.tenants)
                    .where(eq(schema.tenants.id, data.tenantId))
                    .get();

                let siteName: string | undefined;
                if (data.siteId) {
                    const site = await db.select({ name: schema.sites.name })
                        .from(schema.sites)
                        .where(eq(schema.sites.id, data.siteId))
                        .get();
                    siteName = site?.name;
                }

                await sendInvitationEmail(resendApiKey, {
                    to: data.email,
                    inviterName: user.name || user.email,
                    organizationName: tenant?.name || data.tenantId,
                    role: data.role,
                    token,
                    siteName,
                    appUrl,
                });
                emailDelivery.sent = true;
            } catch (emailErr) {
                console.error("Failed to send invitation email:", emailErr);
                emailDelivery.error = emailErr instanceof Error ? emailErr.message : "Unknown email delivery error.";
            }
        } else {
            console.warn("RESEND_API_KEY not configured – invitation email not sent.");
        }

        return { token, emailDelivery };
    });

const GetUsersAndInvitesSchema = z.object({
    tenantId: z.string().optional(),
    siteId: z.string().optional()
});

export const getUsersAndInvitesFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof GetUsersAndInvitesSchema>) => GetUsersAndInvitesSchema.parse(data))
    .handler(async (ctx) => {
        let { tenantId, siteId: inputSiteId } = ctx.data;
        const { db, user } = ctx.context;

        // Initialize siteScopedId outside the block to ensure it's declared for later use
        let siteScopedId: string | null = null;

        // AUTH & SCOPING
        if (!(user as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                tenantId: schema.users.tenantId,
                siteId: schema.userRoles.siteId
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, user.id));


            const myRole = userRoles[0];
            if (!myRole) throw new Error("Unauthorized");

            const myRoleConfig = getRole(myRole.roleName);

            // Force tenantId to own tenant
            tenantId = myRole.tenantId || undefined;

            // If site-scoped, validation below will handle, but for this specific query we need to inject site filtering
            // IMPORTANT: The function returns { users, invitations }. We must filter both.

            if (myRoleConfig?.type === 'site') {
                siteScopedId = myRole.siteId;
            }
        }

        // Determine final site filter
        // If I am site scoped, I MUST use my siteId.
        // If I am NOT site scoped (Tenant admin, Compliance Officer), I CAN use inputSiteId if provided.
        const effectiveSiteId = siteScopedId || inputSiteId;

        // Users Query
        const userConditions: any[] = [];
        if (tenantId) {
            userConditions.push(eq(schema.users.tenantId, tenantId));
        }

        // Apply Scope Filter for Users
        if (effectiveSiteId) {
            userConditions.push(eq(schema.userRoles.siteId, effectiveSiteId));
        }

        const usersList = await db.select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            image: schema.users.image,
            tenantId: schema.users.tenantId,
            tenantName: schema.tenants.name,
            roleName: schema.userRoles.role, // Direct column now
            siteId: schema.userRoles.siteId,
            siteName: schema.sites.name,
            createdAt: schema.users.createdAt,
            isSystemAdmin: schema.users.isSystemAdmin
        })
            .from(schema.users)
            .leftJoin(schema.tenants, eq(schema.users.tenantId, schema.tenants.id))
            .leftJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId))
            .leftJoin(schema.sites, eq(schema.userRoles.siteId, schema.sites.id))
            .where(userConditions.length > 0 ? and(...userConditions) : undefined);

        // Invitations Query
        const inviteConditions: any[] = [eq(schema.invitations.status, 'pending')];
        if (tenantId) {
            inviteConditions.push(eq(schema.invitations.tenantId, tenantId));
        }

        if (effectiveSiteId) {
            inviteConditions.push(eq(schema.invitations.siteId, effectiveSiteId));
        }

        const invitationsList = await db.select({
            id: schema.invitations.id,
            email: schema.invitations.email,
            token: schema.invitations.token,
            tenantId: schema.invitations.tenantId,
            tenantName: schema.tenants.name,
            roleName: schema.invitations.role, // Direct column now
            siteId: schema.invitations.siteId,
            siteName: schema.sites.name,
            status: schema.invitations.status,
            createdAt: schema.invitations.createdAt,
            expiresAt: schema.invitations.expiresAt
        })
            .from(schema.invitations)
            .leftJoin(schema.tenants, eq(schema.invitations.tenantId, schema.tenants.id))
            .leftJoin(schema.sites, eq(schema.invitations.siteId, schema.sites.id))
            .where(and(...inviteConditions));

        return {
            users: usersList,
            invitations: invitationsList
        };
    });

const RevokeInviteSchema = z.object({
    inviteId: z.string()
});

export const revokeInviteFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof RevokeInviteSchema>) => RevokeInviteSchema.parse(data))
    .handler(async (ctx) => {
        const { inviteId } = ctx.data;
        const { db, user } = ctx.context;

        // 1. Authorization Check
        if (!(user as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                tenantId: schema.users.tenantId,
                siteId: schema.userRoles.siteId
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, user.id));

            const myRole = userRoles[0];
            if (!myRole) throw new Error("Unauthorized");
            const myRoleConfig = getRole(myRole.roleName);

            const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer", "GP Partner"];
            if (!allowedRoles.includes(myRole.roleName)) {
                throw new Error("Unauthorized: Your role does not have permission to revoke invites.");
            }

            // Verify invite belongs to same tenant
            const invite = await db.select().from(schema.invitations as any).where(eq(schema.invitations.id, inviteId)).get();
            if (!invite) throw new Error("Invitation not found");

            if (invite.tenantId !== myRole.tenantId) {
                throw new Error("Unauthorized: Cannot manage invites for other tenants.");
            }
            // If site scoped, check site
            if (myRoleConfig?.type === 'site') {
                if (invite.siteId !== myRole.siteId) {
                    throw new Error("Unauthorized: Cannot manage invites for other sites.");
                }
            }
        } else {
            // System admin can delete, just need to check existence if we want to be nice, but delete command works anyway
        }

        await db.delete(schema.invitations).where(eq(schema.invitations.id, inviteId));
        return { success: true };
    });

const DeleteUserSchema = z.object({
    userId: z.string()
});

export const deleteUserFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof DeleteUserSchema>) => DeleteUserSchema.parse(data))
    .handler(async (ctx) => {
        const { userId } = ctx.data;
        const { db, user: currentUser } = ctx.context;

        // Get target user info for authorization and audit
        const targetUser = await db.select({
            id: schema.users.id,
            email: schema.users.email,
            tenantId: schema.users.tenantId,
            isSystemAdmin: schema.users.isSystemAdmin,
        })
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .get();

        if (!targetUser) {
            throw new Error("User not found");
        }

        // Prevent self-deletion
        if (userId === currentUser.id) {
            throw new Error("Cannot delete your own account");
        }

        // Authorization check
        if (!(currentUser as any).isSystemAdmin) {
            // Get current user's role
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                tenantId: schema.users.tenantId,
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, currentUser.id));

            const myRole = userRoles[0];
            if (!myRole) {
                throw new Error("Unauthorized: No role found");
            }

            const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer"];
            if (!allowedRoles.includes(myRole.roleName)) {
                throw new Error("Unauthorized: Insufficient permissions to delete users");
            }

            // Can only delete users in same tenant
            if (targetUser.tenantId !== myRole.tenantId) {
                throw new Error("Unauthorized: Cannot delete users from other tenants");
            }

            // Cannot delete system admins
            if (targetUser.isSystemAdmin) {
                throw new Error("Unauthorized: Cannot delete system administrators");
            }
        }

        // Delete in dependency order
        await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
        await db.delete(schema.accounts).where(eq(schema.accounts.userId, userId));
        await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
        await db.delete(schema.users).where(eq(schema.users.id, userId));

        // Audit log
        const tenantId = targetUser.tenantId || (currentUser as any).tenantId;
        if (tenantId) {
            await logUserEvent(db, {
                tenantId,
                actorUserId: currentUser.id,
                targetUserId: userId,
                action: AUDIT_ACTIONS.USER_DELETED,
                details: { targetUserEmail: targetUser.email },
            });
        }

        return { success: true };
    });

const UpdateUserSchema = z.object({
    userId: z.string(),
    email: z.string().email().optional(),
    // password: z.string().optional() // Too complex for now without hashing util
});

export const updateUserFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof UpdateUserSchema>) => UpdateUserSchema.parse(data))
    .handler(async (ctx) => {
        const { userId, email } = ctx.data;
        const { db, user: currentUser } = ctx.context;

        // Get target user info for authorization
        const targetUser = await db.select({
            id: schema.users.id,
            tenantId: schema.users.tenantId,
            email: schema.users.email,
        })
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .get();

        if (!targetUser) {
            throw new Error("User not found");
        }

        // Users can update their own email, admins can update users in their tenant
        if (userId !== currentUser.id) {
            if (!(currentUser as any).isSystemAdmin) {
                const userRoles = await db.select({
                    roleName: schema.userRoles.role,
                    tenantId: schema.users.tenantId,
                })
                    .from(schema.userRoles)
                    .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                    .where(eq(schema.userRoles.userId, currentUser.id));

                const myRole = userRoles[0];
                if (!myRole) {
                    throw new Error("Unauthorized: No role found");
                }

                const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer"];
                if (!allowedRoles.includes(myRole.roleName)) {
                    throw new Error("Unauthorized: Insufficient permissions to update users");
                }

                if (targetUser.tenantId !== myRole.tenantId) {
                    throw new Error("Unauthorized: Cannot update users from other tenants");
                }
            }
        }

        if (email) {
            await db.update(schema.users)
                .set({ email })
                .where(eq(schema.users.id, userId));
        }

        return { success: true };
    });

const UpdateUserRoleSchema = z.object({
    userId: z.string(),
    role: z.string(),
    siteId: z.string().optional() // Optional, for site-scoped roles if we want to change site too? Or just role. 
    // The requirement is "change roles". Usually role and site go together. 
    // Let's allow changing roleId. If role is site-scoped, we might need siteId validation or we keep existing siteId.
    // For simplicity, let's assume just changing the role for now. 
    // But wait, if they change from Admin (Tenant) to GP Partner (Site), they need a site.
    // So we likely need siteId in input just in case.
});

export const updateUserRoleFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof UpdateUserRoleSchema>) => UpdateUserRoleSchema.parse(data))
    .handler(async (ctx) => {
        const { userId, role } = ctx.data;
        const { db, user } = ctx.context;

        // 1. Authorization Check
        if (!(user as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                tenantId: schema.users.tenantId,
                siteId: schema.userRoles.siteId
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, user.id));

            const myRole = userRoles[0];
            if (!myRole) throw new Error("Unauthorized");
            const myRoleConfig = getRole(myRole.roleName);

            const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer", "GP Partner"];
            if (!allowedRoles.includes(myRole.roleName)) {
                throw new Error("Unauthorized: Your role does not have permission to update roles.");
            }

            // Verify target user belongs to same tenant
            const targetUserRoles = await db.select({
                // tenantId in schema.users is reliable
                siteId: schema.userRoles.siteId
            })
                .from(schema.userRoles)
                .where(eq(schema.userRoles.userId, userId));

            const targetUserRole = targetUserRoles[0];

            // If user has no role (rare), check user table for tenant
            let targetTenantId: string | null | undefined = null;
            const u = await db.select({ tenantId: schema.users.tenantId }).from(schema.users).where(eq(schema.users.id, userId)).get();
            targetTenantId = u?.tenantId;

            if (targetTenantId !== myRole.tenantId) {
                throw new Error("Unauthorized: Cannot update users from other tenants.");
            }

            // If site scoped, check site
            if (myRoleConfig?.type === 'site') {
                const targetSiteId = targetUserRole?.siteId;
                // Note: if target is tenant-scoped (e.g. Admin), a site-scoped user (GP) probably shouldn't be able to edit them?
                // Usually hierarchy matters. But per requirement "those that can invite... can change roles".
                // Let's assume site-scoped users can only edit users IN THEIR SITE.
                if (targetSiteId !== myRole.siteId) {
                    throw new Error("Unauthorized: Cannot update users from other sites.");
                }
            }
        }

        // 2. Validate New Role
        // Is it a valid role?
        const roleConfig = getRole(role);
        if (!roleConfig) throw new Error("Invalid role");

        // Get previous role for audit log
        const previousRoleData = await db.select({ role: schema.userRoles.role })
            .from(schema.userRoles)
            .where(eq(schema.userRoles.userId, userId))
            .get();

        // 3. Update
        await db.update(schema.userRoles)
            .set({ role })
            .where(eq(schema.userRoles.userId, userId));

        // 4. Audit log
        const tenantId = (user as any).tenantId;
        if (tenantId) {
            await logUserEvent(db, {
                tenantId,
                actorUserId: user.id,
                targetUserId: userId,
                action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
                details: {
                    previousRole: previousRoleData?.role,
                    newRole: role,
                },
            });
        }

        // Note: If the new role is site-scoped but the user was tenant-scoped, they might need a siteId update.
        // For now, we assume the UI handles site assignment separately or we only change role here keeping siteId if it exists.
        // If switching from tenant to site role without siteId, it's invalid state.
        // But implementing full update might be complex. Let's start with just roleId update.

        return { success: true };
    });

const GenerateResetLinkSchema = z.object({
    userId: z.string()
});

export const generatePasswordResetLinkFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof GenerateResetLinkSchema>) => GenerateResetLinkSchema.parse(data))
    .handler(async (ctx) => {
        const { userId } = ctx.data;
        const { db, env, user: currentUser } = ctx.context;

        // Get target user info for authorization
        const targetUser = await db.select({
            id: schema.users.id,
            email: schema.users.email,
            name: schema.users.name,
            tenantId: schema.users.tenantId,
        })
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .get();

        if (!targetUser) {
            throw new Error("User not found");
        }

        // Authorization check
        if (!(currentUser as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                tenantId: schema.users.tenantId,
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, currentUser.id));

            const myRole = userRoles[0];
            if (!myRole) {
                throw new Error("Unauthorized: No role found");
            }

            const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer"];
            if (!allowedRoles.includes(myRole.roleName)) {
                throw new Error("Unauthorized: Insufficient permissions to generate password reset links");
            }

            if (targetUser.tenantId !== myRole.tenantId) {
                throw new Error("Unauthorized: Cannot generate reset links for users from other tenants");
            }
        }

        const { createAuth } = await import("@/lib/auth");
        const resendApiKey = env.RESEND_API_KEY;
        const appUrl = env.BETTER_AUTH_URL;

        let capturedToken: string | undefined;
        let deliveryError: string | null = null;
        let emailSent = false;

        const auth = createAuth(db, env, {
            sendResetPassword: async (data: any) => {
                capturedToken = data.token;
                if (!resendApiKey) {
                    return;
                }

                try {
                    await sendPasswordResetEmail(resendApiKey, {
                        to: targetUser.email,
                        token: data.token,
                        resetUrl: data.url,
                        appUrl,
                        userName: targetUser.name,
                    });
                    emailSent = true;
                } catch (error) {
                    console.error("Failed to send password reset email:", error);
                    deliveryError = error instanceof Error ? error.message : "Unknown email delivery error.";
                }
            }
        });

        await auth.api.requestPasswordReset({
            body: {
                email: targetUser.email,
                redirectTo: "/reset-password"
            }
        });

        const fallbackUrl = capturedToken ? buildPasswordResetUrl(appUrl, capturedToken) : null;
        const emailDelivery = {
            configured: Boolean(resendApiKey),
            sent: emailSent,
            error: deliveryError,
            fallbackUrl,
        };

        if (!capturedToken && !emailDelivery.sent) {
            throw new Error("Failed to generate token: Callback was not triggered.");
        }

        // Audit log
        const tenantId = targetUser.tenantId || (currentUser as any).tenantId;
        if (tenantId) {
            await logUserEvent(db, {
                tenantId,
                actorUserId: currentUser.id,
                targetUserId: userId,
                action: AUDIT_ACTIONS.PASSWORD_RESET_GENERATED,
                details: { targetUserEmail: targetUser.email },
            });
        }

        return { emailDelivery };
    });

export const getTenantsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;

        // Authorization: Only system admins can list all tenants
        await requireSystemAdmin(user);

        // 1. Get all tenants
        const tenants = await db.select().from(schema.tenants as any);

        // 2. Get all sites
        const sites = await db.select().from(schema.sites as any);

        // 3. Get all Practice Managers (users with PM role)
        const practiceManagers = await db.select({
            userId: schema.users.id,
            userName: schema.users.name,
            email: schema.users.email,
            tenantId: schema.users.tenantId
        })
            .from(schema.users as any)
            .innerJoin(schema.userRoles as any, eq(schema.users.id, schema.userRoles.userId) as any)
            .where(eq(schema.userRoles.role, 'Practice Manager') as any);

        // 4. Get Pending Invitations for PMs
        const pendingInvitations = await db.select({
            id: schema.invitations.id,
            email: schema.invitations.email,
            tenantId: schema.invitations.tenantId,
            roleName: schema.invitations.role
        })
            .from(schema.invitations as any)
            .where(
                and(
                    eq(schema.invitations.status, 'pending') as any,
                    eq(schema.invitations.role, 'Practice Manager') as any
                )
            );

        // Stitch data
        return tenants.map((tenant: any) => ({
            ...tenant,
            sites: sites.filter((s: any) => s.tenantId === tenant.id),
            practiceManagers: practiceManagers.filter((pm: any) => pm.tenantId === tenant.id),
            practiceManagerRole: 'Practice Manager',
            pendingInvitations: pendingInvitations.filter((inv: any) => inv.tenantId === tenant.id)
        }));
    });

const DeleteTenantSchema = z.object({
    tenantId: z.string()
});

export const deleteTenantFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof DeleteTenantSchema>) => DeleteTenantSchema.parse(data))
    .handler(async (ctx) => {
        const { tenantId } = ctx.data;
        const { db, user } = ctx.context;

        // Authorization: Only system admins can delete tenants
        await requireSystemAdmin(user);

        // Verify tenant exists
        const tenant = await db.select({ name: schema.tenants.name })
            .from(schema.tenants as any)
            .where(eq(schema.tenants.id, tenantId) as any)
            .get();

        if (!tenant) {
            throw new Error("Tenant not found");
        }

        // Note: D1 doesn't support transactions, so we delete in dependency order
        // If any step fails, the previous deletions remain (partial cleanup)

        try {
            // 1. Delete Evidence Links (references tenants)
            await db.delete(schema.evidenceLinks as any).where(eq(schema.evidenceLinks.tenantId, tenantId) as any);

            // 2. Delete Evidence (references tenants)
            await db.delete(schema.evidenceItems as any).where(eq(schema.evidenceItems.tenantId, tenantId) as any);

            // 3. Delete Policy Approvals & Read Attestations (references tenants)
            await db.delete(schema.policyReadAttestations as any).where(eq(schema.policyReadAttestations.tenantId, tenantId) as any);
            await db.delete(schema.policyApprovals as any).where(eq(schema.policyApprovals.tenantId, tenantId) as any);

            // 4. Delete Policy Versions & Policies
            await db.delete(schema.policyVersions as any).where(eq(schema.policyVersions.tenantId, tenantId) as any);
            await db.delete(schema.policies as any).where(eq(schema.policies.tenantId, tenantId) as any);

            // 5. Delete Action Approvals & Actions
            await db.delete(schema.actionApprovals as any).where(eq(schema.actionApprovals.tenantId, tenantId) as any);
            await db.delete(schema.actions as any).where(eq(schema.actions.tenantId, tenantId) as any);

            // 6. Delete Inspection Pack Outputs & Packs
            await db.delete(schema.inspectionPackOutputs as any).where(eq(schema.inspectionPackOutputs.tenantId, tenantId) as any);
            await db.delete(schema.inspectionPacks as any).where(eq(schema.inspectionPacks.tenantId, tenantId) as any);

            // 7. Delete QS Owners & Local Controls
            await db.delete(schema.qsOwners as any).where(eq(schema.qsOwners.tenantId, tenantId) as any);
            await db.delete(schema.localControls as any).where(eq(schema.localControls.tenantId, tenantId) as any);

            // 8. Delete Invitations
            await db.delete(schema.invitations as any).where(eq(schema.invitations.tenantId, tenantId) as any);

            // 9. Delete Sessions & Accounts for Users in this Tenant
            const tenantUsers = await db.select({ id: schema.users.id })
                .from(schema.users as any)
                .where(eq(schema.users.tenantId, tenantId) as any);
            const userIds = tenantUsers.map((u: any) => u.id);

            if (userIds.length > 0) {
                await db.delete(schema.sessions as any).where(inArray(schema.sessions.userId, userIds) as any);
                await db.delete(schema.accounts as any).where(inArray(schema.accounts.userId, userIds) as any);
                await db.delete(schema.userRoles as any).where(inArray(schema.userRoles.userId, userIds) as any);
            }

            // 10. Delete Users
            await db.delete(schema.users as any).where(eq(schema.users.tenantId, tenantId) as any);

            // 11. Delete Sites
            await db.delete(schema.sites as any).where(eq(schema.sites.tenantId, tenantId) as any);

            // 12. Audit log before deleting tenant
            await logUserEvent(db, {
                tenantId,
                actorUserId: user.id,
                action: AUDIT_ACTIONS.TENANT_DELETED,
                details: { tenantName: tenant.name },
            });

            // 13. Finally, Delete Tenant
            await db.delete(schema.tenants as any).where(eq(schema.tenants.id, tenantId) as any);

            return { success: true };
        } catch (error) {
            console.error("Error during tenant deletion:", error);
            throw new Error("Failed to delete tenant. Partial cleanup may have occurred.");
        }
    });

const GetRolesSchema = z.object({
    tenantId: z.string().optional()
});

export const getRolesFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof GetRolesSchema>) => GetRolesSchema.parse(data))
    .handler(async (ctx) => {
        const { user, db } = ctx.context;

        // Authorization: Must be at least a tenant admin to view roles (needed for invite flows)
        if (!(user as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
            })
                .from(schema.userRoles)
                .where(eq(schema.userRoles.userId, user.id));

            const myRole = userRoles[0];
            if (!myRole) {
                throw new Error("Unauthorized: No role found");
            }

            const allowedRoles = ["Practice Manager", "Admin", "Compliance Officer", "GP Partner"];
            if (!allowedRoles.includes(myRole.roleName)) {
                throw new Error("Unauthorized: Insufficient permissions to view roles");
            }
        }

        return ROLES;
    });

const CreateSiteSchema = z.object({
    name: z.string(),
    tenantId: z.string(),
    address: z.string().optional()
});

export const createSiteFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof CreateSiteSchema>) => CreateSiteSchema.parse(data))
    .handler(async (ctx) => {
        const { name, tenantId, address } = ctx.data;
        const { db, user } = ctx.context;

        // Verify tenant exists
        const tenant = await db.select({ id: schema.tenants.id })
            .from(schema.tenants)
            .where(eq(schema.tenants.id, tenantId))
            .get();

        if (!tenant) {
            throw new Error("Tenant not found");
        }

        // AUTH CHECK: System admin or Practice Manager in the same tenant
        if (!(user as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                tenantId: schema.users.tenantId,
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, user.id));

            const myRole = userRoles[0];
            if (!myRole) {
                throw new Error("Unauthorized: No role found");
            }

            // Must be Practice Manager
            if (myRole.roleName !== 'Practice Manager') {
                throw new Error("Unauthorized: Only Practice Managers can create sites.");
            }

            // Must belong to the same tenant
            if (myRole.tenantId !== tenantId) {
                throw new Error("Unauthorized: Cannot create sites for other tenants.");
            }
        }

        const siteId = `s_${crypto.randomUUID().split('-')[0]}`;

        await db.insert(schema.sites as any).values({
            id: siteId,
            tenantId,
            name,
            address,
            createdAt: new Date(),
        });

        // Audit log
        await logUserEvent(db, {
            tenantId,
            actorUserId: user.id,
            action: AUDIT_ACTIONS.SITE_CREATED,
            details: { siteName: name, siteId },
        });

        return { siteId };
    });

const GetSitesSchema = z.object({
    tenantId: z.string()
});

export const getSitesFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof GetSitesSchema>) => GetSitesSchema.parse(data))
    .handler(async (ctx) => {
        const { tenantId } = ctx.data;
        const { db, user } = ctx.context;

        let siteScopedId: string | null = null;

        // AUTH & SCOPING checks
        if (!(user as any).isSystemAdmin) {
            const userRoles = await db.select({
                roleName: schema.userRoles.role,
                siteId: schema.userRoles.siteId
            })
                .from(schema.userRoles)
                .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
                .where(eq(schema.userRoles.userId, user.id));

            const myRole = userRoles[0];
            // If I am site scoped, I can only see my own site

            if (myRole) {
                const config = getRole(myRole.roleName);
                if (config?.type === 'site') {
                    siteScopedId = myRole.siteId;
                }
            }
        }

        const conditions: any[] = [eq(schema.sites.tenantId, tenantId) as any];

        if (siteScopedId) {
            conditions.push(eq(schema.sites.id, siteScopedId) as any);
        }

        const sites = await db.select({
            id: schema.sites.id,
            name: schema.sites.name,
            tenantId: schema.sites.tenantId,
            tenantName: schema.tenants.name,
            address: schema.sites.address,
            createdAt: schema.sites.createdAt,
        }).from(schema.sites as any)
            .innerJoin(schema.tenants as any, eq(schema.sites.tenantId, schema.tenants.id) as any)
            .where(and(...conditions));

        return sites;
    });
