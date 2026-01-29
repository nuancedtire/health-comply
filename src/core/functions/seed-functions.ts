
import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";

export const seedDatabaseFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user, env } = ctx.context;

        if (!(user as any).isSystemAdmin) {
            throw new Error("Unauthorized: Only System Admins can seed the database.");
        }

        const { createAuth } = await import("@/lib/auth");
        // We need 'request' to pass to auth, but usually signUpEmail doesn't need headers if we don't care about session creation for the new user in this context.
        // However, better-auth might need it for some checks. passing empty object might work or ctx.request if available.
        // authMiddleware doesn't pass 'request' in context, but we can access it if we added it.
        // authMiddleware source: "const request = (context as any).request;" but it returns "db, user, session".
        // I can just pass a dummy request or try without.
        const auth = createAuth(db, env);

        const tenantsData = [
            {
                name: "Health Core Ltd",
                sites: ["Downtown Clinic", "Uptown Surgery", "Westside Health"],
                users: [
                    { email: "manager@healthcore.com", name: "Alice Manager", role: "Practice Manager" },
                    { email: "gp1@healthcore.com", name: "Dr. Bob GP", role: "GP Partner", siteIndex: 0 },
                    { email: "gp2@healthcore.com", name: "Dr. Sarah Smith", role: "GP Partner", siteIndex: 1 },
                    { email: "nurse1@healthcore.com", name: "Charlie Nurse", role: "Nurse Lead", siteIndex: 1 },
                    { email: "nurse2@healthcore.com", name: "Diana Nurse", role: "Nurse Lead", siteIndex: 2 },
                    { email: "safeguarding@healthcore.com", name: "Edward Guard", role: "Safeguarding Lead", siteIndex: 0 },
                    { email: "admin1@healthcore.com", name: "Fiona Admin", role: "Admin", siteIndex: 0 },
                    { email: "clinician1@healthcore.com", name: "George Clinician", role: "Clinician", siteIndex: 1 },
                    { email: "reception@healthcore.com", name: "Hannah Frontdesk", role: "Receptionist", siteIndex: 2 },
                    { email: "compliance@healthcore.com", name: "Ian Compliance", role: "Compliance Officer" }
                ]
            },
            {
                name: "Rural Health Trust",
                sites: ["Village Practice", "Remote Outpost"],
                users: [
                    { email: "manager@rural.com", name: "David Manager", role: "Practice Manager" },
                    { email: "admin@rural.com", name: "Isabella Admin", role: "Admin" },
                    { email: "compliance@rural.com", name: "Jack Compliance", role: "Compliance Officer" },
                    { email: "gp@rural.com", name: "Dr. Eve GP", role: "GP Partner", siteIndex: 0 },
                    { email: "partner@rural.com", name: "Dr. Frank Partner", role: "GP Partner", siteIndex: 1 },
                    { email: "nurse@rural.com", name: "Grace Nurse", role: "Nurse Lead", siteIndex: 0 },
                    { email: "safeguarding@rural.com", name: "Karen Guard", role: "Safeguarding Lead", siteIndex: 0 },
                    { email: "clinician@rural.com", name: "Liam Clinician", role: "Clinician", siteIndex: 1 },
                    { email: "reception@rural.com", name: "Henry Frontdesk", role: "Receptionist", siteIndex: 0 }
                ]
            },
            {
                name: "Metropolitan Medical",
                sites: ["Central Hospital", "East Wing Clinic", "West Wing Clinic"],
                users: [
                    { email: "manager@metromed.com", name: "Julian Manager", role: "Practice Manager" },
                    { email: "admin@metromed.com", name: "Monica Admin", role: "Admin" },
                    { email: "compliance@metromed.com", name: "Nathan Compliance", role: "Compliance Officer" },
                    { email: "gp@metromed.com", name: "Dr. Kevin Director", role: "GP Partner", siteIndex: 0 },
                    { email: "nurse@metromed.com", name: "Laura Lead", role: "Nurse Lead", siteIndex: 0 },
                    { email: "safeguarding@metromed.com", name: "Nina Safe", role: "Safeguarding Lead", siteIndex: 0 },
                    { email: "clinician@metromed.com", name: "Mike Clinician", role: "Clinician", siteIndex: 1 },
                    { email: "reception@metromed.com", name: "Oscar Frontdesk", role: "Receptionist", siteIndex: 1 }
                ]
            }
        ];

        const results = [];

        for (const tenantData of tenantsData) {
            // 1. Create Tenant
            const tenantId = `t_${crypto.randomUUID().split('-')[0]}`;
            await db.insert(schema.tenants as any).values({
                id: tenantId,
                name: tenantData.name,
                createdAt: new Date(),
            });

            // 2. Create Roles - SKIPPED (Static Config)
            // const rolesMap = new Map<string, string>(); // Name -> ID
            // for (const rName of roleNames) { ... }

            // 3. Create Sites
            const sitesMap = new Map<number, string>(); // Index -> ID
            for (let i = 0; i < tenantData.sites.length; i++) {
                const sName = tenantData.sites[i];
                const sId = `s_${crypto.randomUUID().split('-')[0]}`;
                await db.insert(schema.sites as any).values({
                    id: sId,
                    tenantId,
                    name: sName,
                    createdAt: new Date(),
                });
                sitesMap.set(i, sId);
            }

            // 4. Create Users
            for (const u of tenantData.users) {
                // const roleId = rolesMap.get(u.role);
                // if (!roleId) continue;
                const role = u.role;

                const siteId = u.siteIndex !== undefined ? sitesMap.get(u.siteIndex) : undefined;

                // Check if user already exists to avoid errors
                const existingUser = await db.select({ id: schema.users.id }).from(schema.users as any).where(eq(schema.users.email, u.email) as any).get();
                if (existingUser) {
                    results.push(`User ${u.email} already exists. Skipping.`);
                    continue;
                }

                // Cleanup any existing pending invites for this email to ensure clean state
                await db.delete(schema.invitations as any).where(eq(schema.invitations.email, u.email) as any);

                // Create User Manually to bypass invite check and ensure correct setup
                const now = new Date();

                // 1. Create User
                // Note: Password123! hashing is complex without the auth lib's internals easily accessible or exposed
                // But better-auth uses scrypt or argon2 usually.
                // Since this is a SEED function for DEV, we can just use the auth client to create the user if we disable the hook check?
                // OR we can rely on the fact that we just created the invitation above!
                // The hook in auth.ts checks for a PENDING invitation.

                // Let's create the invitation first, and ensure it IS pending.
                const inviteToken = crypto.randomUUID();
                const inviteId = `inv_${crypto.randomUUID()}`;
                await db.insert(schema.invitations as any).values({
                    id: inviteId,
                    email: u.email,
                    tenantId,
                    siteId,
                    role,
                    token: inviteToken,
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                    status: 'pending',
                    invitedBy: user.id,
                    createdAt: now,
                });

                // 2. Use auth.api.signUpEmail
                // This triggers the 'before' hook which CHECKS for the invitation we just created.
                // Then triggers 'after' hook which assigns roles and marks invite accepted.
                try {
                    await auth.api.signUpEmail({
                        body: {
                            email: u.email,
                            password: "Password123!",
                            name: u.name,
                        }
                    });
                    results.push(`Created user ${u.email} (Invitation Accepted)`);
                } catch (e: any) {
                    console.error(`Failed to seed user ${u.email}:`, e);
                    // If it failed, maybe the hook didn't find the invite?
                    // Better debugging:
                    results.push(`Failed to create user ${u.email}: ${e.message}`);
                }
            }
        }

        return { success: true, results };
    });

export const resetDatabaseFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;

        if (!(user as any).isSystemAdmin) {
            throw new Error("Unauthorized: Only System Admins can reset the database.");
        }

        const tenants = await db.select().from(schema.tenants as any);
        let deletedCount = 0;
        let cqcReset = false;

        for (const tenant of tenants) {
            const tenantId = tenant.id;
            const isCurrentTenant = (user as any).tenantId === tenantId;

            // Common delete operations (Operational Data) - Apply to ALL tenants
            // 1. Delete Evidence Links (references tenants)
            await db.delete(schema.evidenceLinks as any).where(eq(schema.evidenceLinks.tenantId, tenantId) as any);

            // 2. Delete Evidence (references tenants)
            await db.delete(schema.evidenceItems as any).where(eq(schema.evidenceItems.tenantId, tenantId) as any);

            // 3. Delete Policy Approvals & Read Attestations
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

            // 8. Delete Audit Log
            await db.delete(schema.auditLog as any).where(eq(schema.auditLog.tenantId, tenantId) as any);

            // Structure Deletion - ONLY for OTHER tenants
            if (!isCurrentTenant) {
                // 9. Delete Invitations
                await db.delete(schema.invitations as any).where(eq(schema.invitations.tenantId, tenantId) as any);

                // 10. Delete Sessions & Accounts for Users in this Tenant
                const tenantUsers = await db.select({ id: schema.users.id }).from(schema.users as any).where(eq(schema.users.tenantId, tenantId) as any);
                const userIds = tenantUsers.map((u: any) => u.id);

                if (userIds.length > 0) {
                    await db.delete(schema.sessions as any).where(inArray(schema.sessions.userId, userIds) as any);
                    await db.delete(schema.accounts as any).where(inArray(schema.accounts.userId, userIds) as any);
                    await db.delete(schema.userRoles as any).where(inArray(schema.userRoles.userId, userIds) as any);
                }

                // 11. Delete Users
                await db.delete(schema.users as any).where(eq(schema.users.tenantId, tenantId) as any);

                // 12. Delete Roles - SKIP


                // 13. Delete Sites
                await db.delete(schema.sites as any).where(eq(schema.sites.tenantId, tenantId) as any);

                // 14. Finally, Delete Tenant
                await db.delete(schema.tenants as any).where(eq(schema.tenants.id, tenantId) as any);

                deletedCount++;
            } else {
                console.log(`Cleared operational data for current tenant: ${tenant.name}, but preserved structure.`);
            }
        }

        // After clearing all operational data from all tenants (including current), we can safely reset CQC taxonomy
        try {
            await db.delete(schema.cqcQualityStatements as any);
            await db.delete(schema.cqcKeyQuestions as any);
            await db.delete(schema.evidenceCategories as any);
            cqcReset = true;
        } catch (error) {
            console.error("Failed to reset CQC taxonomy during full reset:", error);
            // This shouldn't happen if we cleared all children, but theoretically possible if new dependencies exist
        }

        return { success: true, deletedCount, cqcReset };
    });
