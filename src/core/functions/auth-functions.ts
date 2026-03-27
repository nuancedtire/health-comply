import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { sendPasswordResetEmail } from "@/lib/email";

const getDb = (env: any) => drizzle(env.DB, { schema: schema as any });

const CheckInviteSchema = z.object({
    token: z.string()
});

export const checkInviteFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof CheckInviteSchema>) => CheckInviteSchema.parse(data))
    .handler(async (ctx) => {
        const { token } = ctx.data;
        const db = getDb((ctx.context as any).env) as any;

        // Since we removed relations, we can't use db.query with 'with' freely if relations are gone.
        // But invitations still has tenant and site?
        // Let's use db.select for safety and clarity as schemas changed.
        const invite = await db.select({
            email: schema.invitations.email,
            tenantName: schema.tenants.name,
            siteName: schema.sites.name,
            roleName: schema.invitations.role,
            status: schema.invitations.status,
            expiresAt: schema.invitations.expiresAt,
        })
            .from(schema.invitations)
            .leftJoin(schema.tenants, eq(schema.invitations.tenantId, schema.tenants.id))
            .leftJoin(schema.sites, eq(schema.invitations.siteId, schema.sites.id))
            .where(eq(schema.invitations.token, token))
            .get();

        if (!invite) {
            throw new Error("Invalid or expired invitation.");
        }

        // Check expiry
        if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
            throw new Error("This invitation has expired.");
        }

        if (invite.status === 'accepted') {
            throw new Error("This invitation has already been used.");
        }

        return {
            email: invite.email,
            tenantName: invite.tenantName,
            siteName: invite.siteName,
            roleName: invite.roleName,
            valid: true
        };
    });

const FindTenantSchema = z.object({
    query: z.string().min(2)
});

export const findTenantFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof FindTenantSchema>) => FindTenantSchema.parse(data))
    .handler(async (ctx) => {
        const { query } = ctx.data;
        const db = getDb((ctx.context as any).env) as any;

        // Perform case-insensitive search (if supported) or exact match for now
        // Ideally use 'like' operator
        const { like } = await import("drizzle-orm");

        const tenants = await db.query.tenants.findMany({
            where: like(schema.tenants.name, `%${query}%`),
            limit: 5,
            columns: {
                id: true,
                name: true
            }
        });

        return tenants;
    });

export const checkSystemInitializedFn = createServerFn({ method: "GET" })
    .handler(async (ctx) => {
        const db = getDb((ctx.context as any).env) as any;
        const { count } = await import("drizzle-orm");

        // Check if any user with isSystemAdmin = true exists
        const result = await db.select({ count: count() })
            .from(schema.users)
            .where(eq(schema.users.isSystemAdmin, true));

        // If count > 0, system is initialized
        return { initialized: result[0].count > 0 };
    });

const CreateSystemAdminSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8)
});

export const createSystemAdminFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof CreateSystemAdminSchema>) => CreateSystemAdminSchema.parse(data))
    .handler(async (ctx) => {
        const { name, email, password } = ctx.data;
        const env = (ctx.context as any).env;
        const db = getDb(env) as any;
        const { count } = await import("drizzle-orm");

        // Double-check initialization status for security
        const result = await db.select({ count: count() })
            .from(schema.users)
            .where(eq(schema.users.isSystemAdmin, true));

        if (result[0].count > 0) {
            throw new Error("System is already initialized. Cannot create another system admin via this method.");
        }

        // Initialize Auth locally just for this operation to use built-in signup
        const { createAuth } = await import("@/lib/auth");
        const auth = createAuth(db, env);

        // Create the user via Better Auth to handle password hashing etc.
        const user = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
                // We'll set isSystemAdmin manually after specific hook or just direct DB update if BA doesn't support custom fields in signup easily without plugins
                // Actually BA supports mapping, but let's be safe and update it immediately
            }
        });

        if (!user) {
            throw new Error("Failed to create user.");
        }

        // Manually promote to System Admin
        await db.update(schema.users)
            .set({ isSystemAdmin: true })
            .where(eq(schema.users.id, user.user.id));


        return { success: true, user: user.user };
    });

import { getRole } from "@/lib/config/roles";

// ===== SIGNUP + CREATE TENANT (New Organization Flow) =====

const SignupAndCreateTenantSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
});

export const signupAndCreateTenantFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof SignupAndCreateTenantSchema>) => SignupAndCreateTenantSchema.parse(data))
    .handler(async (ctx) => {
        const { name, email, password, organizationName } = ctx.data;
        const env = (ctx.context as any).env;
        const db = getDb(env) as any;

        // Check if email is already taken
        const existingUser = await db.query.users.findFirst({
            where: eq(schema.users.email, email),
        });
        if (existingUser) {
            throw new Error("An account with this email already exists.");
        }

        // 1. Create the tenant
        const tenantId = `t_${crypto.randomUUID().split('-')[0]}`;
        await db.insert(schema.tenants).values({
            id: tenantId,
            name: organizationName,
            createdAt: new Date(),
        });

        // 2. Create a self-invite so the Better Auth databaseHook allows registration.
        //    We use a temporary userId for invitedBy, then update after user creation.
        const inviteId = `inv_${crypto.randomUUID().split('-')[0]}`;
        const token = crypto.randomUUID();

        // Temporarily insert invite without invitedBy (we'll fix this after user creation)
        // Since invitedBy is NOT NULL, we need to work around it.
        // Approach: Insert user first via auth, which will find this invite.
        // We use a raw SQL to bypass the NOT NULL constraint temporarily.
        await db.run(
            `INSERT INTO invitations (id, email, tenant_id, site_id, role, token, expires_at, status, invited_by, created_at)
             VALUES (?, ?, ?, NULL, 'Director', ?, ?, 'pending', '__self__', ?)`,
            [inviteId, email, tenantId, token,
             Math.floor(Date.now() / 1000) + 86400,
             Math.floor(Date.now() / 1000)]
        );

        // 3. Create the user via Better Auth (the databaseHook will find the invite
        //    and assign tenantId + Director role automatically)
        const { createAuth } = await import("@/lib/auth");
        const auth = createAuth(db, env);

        let result;
        try {
            result = await auth.api.signUpEmail({
                body: { email, password, name }
            });
        } catch (err) {
            // Clean up on failure
            await db.run(`DELETE FROM invitations WHERE id = ?`, [inviteId]);
            await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
            throw err;
        }

        if (!result) {
            await db.run(`DELETE FROM invitations WHERE id = ?`, [inviteId]);
            await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
            throw new Error("Failed to create user account.");
        }

        // 4. Fix the invitedBy to point to the newly created user
        await db.run(
            `UPDATE invitations SET invited_by = ? WHERE id = ?`,
            [result.user.id, inviteId]
        );

        return { success: true, tenantId, userId: result.user.id };
    });

export const getCurrentUserRoleFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;

        // System Admin override
        if ((user as any).isSystemAdmin) {
            return { role: "Super Admin" };
        }

        // Using db.select to avoid type issues with db.query in middleware context
        const userRoles = await db.select({
            roleName: schema.userRoles.role,
            siteId: schema.userRoles.siteId
        })
            .from(schema.userRoles)
            .where(eq(schema.userRoles.userId, user.id))
            .limit(1);

        const roleName = userRoles[0]?.roleName || "User";
        const roleConfig = getRole(roleName);

        return {
            role: roleName,
            type: roleConfig?.type || "site", // Default to site/restricted
            siteId: userRoles[0]?.siteId
        };
    });

const RequestPasswordResetSchema = z.object({
    email: z.string().email()
});

export const requestPasswordResetFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof RequestPasswordResetSchema>) => RequestPasswordResetSchema.parse(data))
    .handler(async (ctx) => {
        const { email } = ctx.data;
        const env = (ctx.context as any).env;
        const db = getDb(env) as any;
        const resendApiKey = env.RESEND_API_KEY as string | undefined;

        if (!resendApiKey) {
            console.warn("RESEND_API_KEY not configured – password reset email not sent.");
            return {
                success: true,
                emailServiceConfigured: false,
            };
        }

        const { createAuth } = await import("@/lib/auth");
        const auth = createAuth(db, env, {
            sendResetPassword: async (data: any) => {
                try {
                    await sendPasswordResetEmail(resendApiKey, {
                        to: email,
                        token: data.token,
                        resetUrl: data.url,
                        appUrl: env.BETTER_AUTH_URL,
                    });
                } catch (error) {
                    console.error("Password reset email delivery failed:", error);
                }
            }
        });

        try {
            await auth.api.requestPasswordReset({
                body: { email, redirectTo: "/reset-password" }
            });
        } catch (e) {
            console.error("Password reset request failed:", e);
        }

        return {
            success: true,
            emailServiceConfigured: true,
        };
    });

const ResetPasswordSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(8)
});

export const resetPasswordFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof ResetPasswordSchema>) => ResetPasswordSchema.parse(data))
    .handler(async (ctx) => {
        const { token, newPassword } = ctx.data;
        const env = (ctx.context as any).env;
        const db = getDb(env) as any;
        const { createAuth } = await import("@/lib/auth");
        const auth = createAuth(db, env);

        const res = await (auth.api as any).resetPassword({
            body: {
                token,
                newPassword
            }
        });

        if ((res as any)?.error) {
            throw new Error((res as any).error.message);
        }

        return { success: true };
    });
