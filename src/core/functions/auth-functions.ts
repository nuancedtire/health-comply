import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
