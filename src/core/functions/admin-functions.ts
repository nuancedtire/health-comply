import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "@/core/middleware/auth-middleware";

// Admin functions are protected by authMiddleware
// Middleware provides: user, session, db

const CreateTenantSchema = z.object({
    name: z.string(),
    slug: z.string().optional()
});

export const createTenantFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof CreateTenantSchema>) => CreateTenantSchema.parse(data))
    .handler(async (ctx) => {
        const { name } = ctx.data;
        const { db } = ctx.context;

        // 2. Create Tenant
        // Use crypto.randomUUID for IDs or a simple random string for 't_...'
        const tenantId = `t_${crypto.randomUUID().split('-')[0]}`; // Short ID

        await db.insert(schema.tenants as any).values({
            id: tenantId,
            name: name,
            createdAt: new Date(),
        });

        // 3. Seed Roles
        const roleNames = [
            "Practice Manager",
            "GP Partner",
            "Nurse Lead",
            "Safeguarding Lead",
            "Admin" // Tenant Admin
        ];

        const rolesToInsert = roleNames.map((name: string) => ({
            id: `r_${crypto.randomUUID()}`,
            tenantId,
            name,
        }));

        await db.insert(schema.roles as any).values(rolesToInsert);

        return { tenantId, roles: rolesToInsert };
    });

const InviteUserSchema = z.object({
    email: z.string().email(),
    tenantId: z.string(),
    siteId: z.string().optional(),
    roleId: z.string()
});

export const inviteUserFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof InviteUserSchema>) => InviteUserSchema.parse(data))
    .handler(async (ctx) => {
        const data = ctx.data;
        const { db, user } = ctx.context;

        const token = crypto.randomUUID();

        await db.insert(schema.invitations as any).values({
            id: `inv_${crypto.randomUUID()}`,
            email: data.email,
            tenantId: data.tenantId,
            siteId: data.siteId, // might be undefined, Drizzle handles optional if column is nullable
            roleId: data.roleId,
            token,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
            status: 'pending',
            invitedBy: user.id, // Populated from authMiddleware
            createdAt: new Date(),
        });

        return { token };
    });

export const getTenantsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db } = ctx.context;
        const tenants = await db.select().from(schema.tenants as any);
        return tenants;
    });

const DeleteTenantSchema = z.object({
    tenantId: z.string()
});

export const deleteTenantFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof DeleteTenantSchema>) => DeleteTenantSchema.parse(data))
    .handler(async (ctx) => {
        const { tenantId } = ctx.data;
        const { db } = ctx.context;
        await db.delete(schema.tenants as any).where(eq(schema.tenants.id, tenantId) as any);
        return { success: true };
    });

const GetRolesSchema = z.object({
    tenantId: z.string().optional()
});

export const getRolesFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: z.infer<typeof GetRolesSchema>) => GetRolesSchema.parse(data))
    .handler(async (ctx) => {
        const { tenantId } = ctx.data;
        const { db } = ctx.context;

        let query: any = db.select().from(schema.roles as any);
        if (tenantId) {
            query = query.where(eq(schema.roles.tenantId, tenantId) as any);
        }

        const roles = await query;
        return roles;
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
        const { db } = ctx.context;

        const siteId = `s_${crypto.randomUUID().split('-')[0]}`;

        await db.insert(schema.sites as any).values({
            id: siteId,
            tenantId,
            name,
            address,
            createdAt: new Date(),
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
        const { db } = ctx.context;

        const sites = await db.select().from(schema.sites as any)
            .where(eq(schema.sites.tenantId, tenantId) as any);

        return sites;
    });
