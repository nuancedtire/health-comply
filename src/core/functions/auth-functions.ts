import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "@/core/middleware/auth-middleware";

const getDb = (env: any) => drizzle(env.DB, { schema: schema as any });

const CheckInviteSchema = z.object({
    token: z.string()
});

export const checkInviteFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof CheckInviteSchema>) => CheckInviteSchema.parse(data))
    .handler(async (ctx) => {
        const { token } = ctx.data;
        const db = getDb((ctx.context as any).env) as any;

        const invite = await db.query.invitations.findFirst({
            where: eq(schema.invitations.token, token),
            with: {
                tenant: true,
                site: true,
                role: true,
            }
        });

        if (!invite) {
            throw new Error("Invalid or expired invitation.");
        }

        // Return public info
        return {
            email: invite.email,
            tenantName: invite.tenant.name,
            siteName: invite.site?.name,
            roleName: invite.role.name,
            valid: true
        };
    });

const FindTenantSchema = z.object({
    query: z.string().min(3)
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
        const auth = createAuth(db);

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
            roleName: schema.roles.name,
            roleType: schema.roles.type,
            siteId: schema.userRoles.siteId
        })
            .from(schema.userRoles)
            .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
            .where(eq(schema.userRoles.userId, user.id))
            .limit(1);

        return {
            role: userRoles[0]?.roleName || "User",
            type: userRoles[0]?.roleType || "site", // Default to site/restricted
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
        const db = getDb((ctx.context as any).env) as any;
        const { createAuth } = await import("@/lib/auth");
        const auth = createAuth(db);

        // 1. Trigger Better Auth's forget password
        // This usually sends an email. 
        // We'll catch errors if user not found.
        try {
            // Using 'any' bypasses potential type mismatches with Better Auth plugins/versions
            await (auth.api as any).forgetPassword({
                body: { email, redirectTo: "/reset-password" }
            });
        } catch (e) {
            // If user doesn't exist, BA might throw or just return. 
            // For security, generally return success.
            // But for this debug/demo, we want the token.
            console.error(e);
        }

        // 2. Peek into DB to find the token (DEMO ONLY)
        // Switch to db.select to avoid query builder type issues if schemas mismatch
        const { desc } = await import("drizzle-orm");

        const verification = await db.select({ value: schema.verifications.value })
            .from(schema.verifications as any)
            .where(eq(schema.verifications.identifier, email) as any)
            .orderBy(desc(schema.verifications.createdAt))
            .limit(1)
            .get();

        // The token value is what we need.
        return { success: true, token: verification?.value };
    });

const ResetPasswordSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(8)
});

export const resetPasswordFn = createServerFn({ method: "POST" })
    .inputValidator((data: z.infer<typeof ResetPasswordSchema>) => ResetPasswordSchema.parse(data))
    .handler(async (ctx) => {
        const { token, newPassword } = ctx.data;
        const db = getDb((ctx.context as any).env) as any;
        const { createAuth } = await import("@/lib/auth");
        const auth = createAuth(db);

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

