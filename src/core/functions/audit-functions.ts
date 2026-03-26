import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { authMiddleware } from "@/core/middleware/auth-middleware";
import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

/**
 * Get audit logs for the current tenant
 * Only Directors, Admins, and Compliance Officers can view audit logs
 */
export const getAuditLogsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) =>
        z.object({
            entityType: z.string().optional(),
            entityId: z.string().optional(),
            actorUserId: z.string().optional(),
            action: z.string().optional(),
            fromDate: z.string().optional(), // ISO date string
            toDate: z.string().optional(),
            limit: z.number().optional().default(100),
            offset: z.number().optional().default(0),
            tenantId: z.string().optional(),
        }).optional().parse(data)
    )
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        let tenantId = (user as any).tenantId;
        const isSystemAdmin = (user as any).isSystemAdmin;

        if (isSystemAdmin && data?.tenantId) {
            tenantId = data.tenantId;
        }

        if (!tenantId && !isSystemAdmin) {
            throw new Error("Tenant ID required");
        }

        // Authorization: Check if user has permission to view audit logs
        // If system admin, they have permission automatically
        let hasPermission = isSystemAdmin;
        
        if (!hasPermission) {
            const userRoles = await db.select({ role: schema.userRoles.role })
                .from(schema.userRoles)
                .where(eq(schema.userRoles.userId, user.id));

            const allowedRoles = ["Director", "Admin", "Compliance Officer"];
            hasPermission = userRoles.some(r => allowedRoles.includes(r.role));
        }

        if (!hasPermission) {
            throw new Error("Unauthorized: Only Directors, Admins, and Compliance Officers can view audit logs");
        }

        // Build query conditions
        const conditions: any[] = [];
        
        if (tenantId && tenantId !== "all") {
             conditions.push(eq(schema.auditLog.tenantId, tenantId));
        } else if (!isSystemAdmin) {
             // Non-admins must have a tenantId
             throw new Error("Tenant ID required");
        }
        // If system admin and tenantId is "all" or undefined (and they want all), we don't add the tenantId condition. 
        // But let's stick to the behavior that they select a tenant or see their own if they have one?
        // Actually, for superadmin without tenantId, they might want to see ALL logs.
        // Let's assume if tenantId is not provided or "all", and they are superadmin, we show all.
        // But the previous code was: const tenantId = (user as any).tenantId; if (!tenantId) throw...
        
        // If superadmin has no tenantId, they default to seeing nothing or everything?
        // Let's assume "all" is a valid option for superadmin.


        if (data?.entityType) {
            conditions.push(eq(schema.auditLog.entityType, data.entityType));
        }
        if (data?.entityId) {
            conditions.push(eq(schema.auditLog.entityId, data.entityId));
        }
        if (data?.actorUserId) {
            conditions.push(eq(schema.auditLog.actorUserId, data.actorUserId));
        }
        if (data?.action) {
            conditions.push(eq(schema.auditLog.action, data.action));
        }
        if (data?.fromDate) {
            conditions.push(gte(schema.auditLog.createdAt, new Date(data.fromDate)));
        }
        if (data?.toDate) {
            conditions.push(lte(schema.auditLog.createdAt, new Date(data.toDate)));
        }

        // Aliases for entity-type-specific joins to resolve human-readable names
        const entityUser = alias(schema.users, "entity_user");
        const entityEvidence = alias(schema.evidenceItems, "entity_evidence");
        const entityControl = alias(schema.localControls, "entity_control");
        const entityPolicy = alias(schema.policies, "entity_policy");
        const entityInvitation = alias(schema.invitations, "entity_invitation");

        // Fetch logs with actor user info and resolved entity names
        const logs = await db.select({
            id: schema.auditLog.id,
            tenantId: schema.auditLog.tenantId,
            actorUserId: schema.auditLog.actorUserId,
            actorName: schema.users.name,
            actorEmail: schema.users.email,
            action: schema.auditLog.action,
            entityType: schema.auditLog.entityType,
            entityId: schema.auditLog.entityId,
            jsonDiff: schema.auditLog.jsonDiff,
            createdAt: schema.auditLog.createdAt,
            // Resolve entity name from whichever joined table matches
            entityName: sql<string | null>`COALESCE(
                ${entityEvidence.title},
                ${entityControl.title},
                ${entityPolicy.title},
                ${entityUser.name},
                ${entityInvitation.email}
            )`,
        })
            .from(schema.auditLog)
            .leftJoin(schema.users, eq(schema.auditLog.actorUserId, schema.users.id))
            .leftJoin(entityEvidence, and(
                eq(schema.auditLog.entityId, entityEvidence.id),
                eq(schema.auditLog.entityType, "evidence")
            ))
            .leftJoin(entityControl, and(
                eq(schema.auditLog.entityId, entityControl.id),
                eq(schema.auditLog.entityType, "local_control")
            ))
            .leftJoin(entityPolicy, and(
                eq(schema.auditLog.entityId, entityPolicy.id),
                eq(schema.auditLog.entityType, "policy")
            ))
            .leftJoin(entityUser, and(
                eq(schema.auditLog.entityId, entityUser.id),
                eq(schema.auditLog.entityType, "user")
            ))
            .leftJoin(entityInvitation, and(
                eq(schema.auditLog.entityId, entityInvitation.id),
                eq(schema.auditLog.entityType, "invitation")
            ))
            .where(and(...conditions))
            .orderBy(desc(schema.auditLog.createdAt))
            .limit(data?.limit || 100)
            .offset(data?.offset || 0);

        // Get total count for pagination
        const countResult = await db.select({ count: sql<number>`count(*)` })
            .from(schema.auditLog)
            .where(and(...conditions));

        const totalCount = countResult[0]?.count || 0;

        return {
            logs: logs.map(log => ({
                ...log,
                details: log.jsonDiff ? JSON.parse(log.jsonDiff as string) : null,
            })),
            totalCount,
            limit: data?.limit || 100,
            offset: data?.offset || 0,
        };
    });

/**
 * Get audit log for a specific entity (e.g., evidence item history)
 */
export const getEntityAuditHistoryFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) =>
        z.object({
            entityType: z.string(),
            entityId: z.string(),
        }).parse(data)
    )
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        const tenantId = (user as any).tenantId;

        if (!tenantId) {
            throw new Error("Tenant ID required");
        }

        const logs = await db.select({
            id: schema.auditLog.id,
            actorUserId: schema.auditLog.actorUserId,
            actorName: schema.users.name,
            action: schema.auditLog.action,
            jsonDiff: schema.auditLog.jsonDiff,
            createdAt: schema.auditLog.createdAt,
        })
            .from(schema.auditLog)
            .leftJoin(schema.users, eq(schema.auditLog.actorUserId, schema.users.id))
            .where(
                and(
                    eq(schema.auditLog.tenantId, tenantId),
                    eq(schema.auditLog.entityType, data.entityType),
                    eq(schema.auditLog.entityId, data.entityId)
                )
            )
            .orderBy(desc(schema.auditLog.createdAt));

        return {
            history: logs.map(log => ({
                ...log,
                details: log.jsonDiff ? JSON.parse(log.jsonDiff as string) : null,
            })),
        };
    });

/**
 * Get available filter options for audit log UI
 */
export const getAuditLogFilterOptionsFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .inputValidator((data: unknown) =>
        z.object({
            tenantId: z.string().optional(),
        }).optional().parse(data)
    )
    .handler(async ({ context, data }) => {
        const { db, user } = context;
        let tenantId = (user as any).tenantId;
        const isSystemAdmin = (user as any).isSystemAdmin;

        if (isSystemAdmin && data?.tenantId) {
            tenantId = data.tenantId;
        }

        // If no tenant selected and is super admin, maybe show all options?
        // But query requires filtering.
        
        const conditions: any[] = [];
        if (tenantId && tenantId !== "all") {
            conditions.push(eq(schema.auditLog.tenantId, tenantId));
        }

        // Get distinct entity types
        const entityTypes = await db.selectDistinct({ entityType: schema.auditLog.entityType })
            .from(schema.auditLog)
            .where(and(...conditions));

        // Get distinct actions
        const actions = await db.selectDistinct({ action: schema.auditLog.action })
            .from(schema.auditLog)
            .where(and(...conditions));

        // Get users who have taken actions
        const actors = await db.selectDistinct({
            userId: schema.auditLog.actorUserId,
            userName: schema.users.name,
        })
            .from(schema.auditLog)
            .leftJoin(schema.users, eq(schema.auditLog.actorUserId, schema.users.id))
            .where(and(...conditions));

        return {
            entityTypes: entityTypes.map(e => e.entityType),
            actions: actions.map(a => a.action),
            actors: actors.filter(a => a.userId).map(a => ({
                id: a.userId,
                name: a.userName || "Unknown",
            })),
        };
    });

/**
 * Get simple list of tenants for the dropdown
 */
export const getTenantsListFn = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const { db, user } = context;
        
        if (!(user as any).isSystemAdmin) {
            return [];
        }

        const tenants = await db.select({
            id: schema.tenants.id,
            name: schema.tenants.name,
        })
            .from(schema.tenants)
            .orderBy(schema.tenants.name);

        return tenants;
    });
