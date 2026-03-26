
import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";

// Batch size for inserts to avoid SQLite's "too many SQL variables" error
// SQLite has a limit of ~999 host parameters; with ~10 columns per record,
// batching at 10 records keeps us well under the limit
const BATCH_SIZE = 10;

// Helper to insert records in batches
async function batchInsert<T>(
    db: any,
    table: any,
    records: T[]
): Promise<void> {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        await db.insert(table).values(batch);
    }
}

export const seedDatabaseFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user, env } = ctx.context;

        if (!(user as any).isSystemAdmin) {
            throw new Error("Unauthorized: Only System Admins can seed the database.");
        }

        // Use custom PBKDF2 hasher optimized for Cloudflare Workers
        // (Better Auth's default scrypt exceeds Workers CPU limits)
        const { hashPassword } = await import("@/lib/password");
        const DEFAULT_PASSWORD = "Password123!";
        const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

        const tenantsData = [
            {
                name: "Health Core Ltd",
                sites: ["Downtown Clinic", "Uptown Surgery", "Westside Health"],
                users: [
                    { email: "manager@healthcore.com", name: "Alice Manager", role: "Director" },
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
                    { email: "manager@rural.com", name: "David Manager", role: "Director" },
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
                    { email: "manager@metromed.com", name: "Julian Manager", role: "Director" },
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

        const now = new Date();

        // Check for existing tenants and sites upfront to minimize DB queries
        // This is critical for Cloudflare Workers to avoid resource exceeded errors
        const [existingTenants, existingSites, existingUsersCheck] = await Promise.all([
            db.select({ id: schema.tenants.id, name: schema.tenants.name })
                .from(schema.tenants as any),
            db.select({ id: schema.sites.id, name: schema.sites.name, tenantId: schema.sites.tenantId })
                .from(schema.sites as any),
            db.select({ email: schema.users.email })
                .from(schema.users as any)
        ]);

        const existingTenantMap = new Map(
            existingTenants.map((t: any) => [t.name, t.id])
        );

        // Group existing sites by tenant ID for quick lookup
        const existingSitesByTenant = new Map<string, Map<string, string>>();
        for (const site of existingSites as any[]) {
            if (!existingSitesByTenant.has(site.tenantId)) {
                existingSitesByTenant.set(site.tenantId, new Map());
            }
            existingSitesByTenant.get(site.tenantId)!.set(site.name, site.id);
        }

        // Pre-compute existing emails for filtering
        const existingEmails = new Set((existingUsersCheck as any[]).map(u => u.email));

        // Prepare all data for batch inserts
        const allTenants: any[] = [];
        const allSites: any[] = [];
        const allUsers: any[] = [];
        const allInvitations: any[] = [];
        const allUserRoles: any[] = [];

        // Map to track tenant and site IDs
        const tenantIdMap = new Map<string, string>();
        const siteIdMap = new Map<string, Map<number, string>>();

        // Step 1: Prepare all tenants (or reuse existing ones)
        for (const tenantData of tenantsData) {
            let tenantId: string;

            // Check if tenant already exists
            if (existingTenantMap.has(tenantData.name)) {
                tenantId = existingTenantMap.get(tenantData.name)!;
            } else {
                tenantId = `t_${crypto.randomUUID().split('-')[0]}`;
                allTenants.push({
                    id: tenantId,
                    name: tenantData.name,
                    createdAt: now,
                });
            }

            tenantIdMap.set(tenantData.name, tenantId);

            // Step 2: Use pre-fetched site data (no DB query needed here)
            const existingSiteMap = existingSitesByTenant.get(tenantId) || new Map<string, string>();

            // Prepare all sites for this tenant (or reuse existing ones)
            const sitesForTenant = new Map<number, string>();
            for (let i = 0; i < tenantData.sites.length; i++) {
                const siteName = tenantData.sites[i];
                let sId: string;

                if (existingSiteMap.has(siteName)) {
                    sId = existingSiteMap.get(siteName)!;
                } else {
                    sId = `s_${crypto.randomUUID().split('-')[0]}`;
                    allSites.push({
                        id: sId,
                        tenantId,
                        name: siteName,
                        createdAt: now,
                    });
                }

                sitesForTenant.set(i, sId);
            }
            siteIdMap.set(tenantData.name, sitesForTenant);

            // Step 3: Prepare all users for this tenant
            for (const u of tenantData.users) {
                const userId = `u_${crypto.randomUUID()}`;
                const siteId = u.siteIndex !== undefined ? sitesForTenant.get(u.siteIndex) : undefined;
                const inviteId = `inv_${crypto.randomUUID()}`;

                allUsers.push({
                    id: userId,
                    email: u.email,
                    emailVerified: 1,
                    name: u.name,
                    tenantId,
                    isSystemAdmin: 0,
                    createdAt: now,
                    updatedAt: now,
                });

                // Create invitation record (will be marked as accepted)
                allInvitations.push({
                    id: inviteId,
                    email: u.email,
                    tenantId,
                    siteId,
                    role: u.role,
                    token: crypto.randomUUID(),
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                    status: 'accepted',
                    invitedBy: user.id,
                    acceptedAt: now,
                    createdAt: now,
                });

                // Create user role assignment
                allUserRoles.push({
                    id: `ur_${crypto.randomUUID()}`,
                    userId,
                    tenantId,
                    siteId,
                    role: u.role,
                    createdAt: now,
                });
            }
        }

        // Filter out existing users using pre-fetched data (no additional DB query needed)
        const allEmails = allUsers.map(u => u.email);
        const emailsToSkip = allEmails.filter(email => existingEmails.has(email));

        if (emailsToSkip.length > 0) {
            // Filter out existing users
            const filteredUsers = allUsers.filter(u => !existingEmails.has(u.email));
            const filteredUserIds = new Set(filteredUsers.map(u => u.id));
            const filteredInvitations = allInvitations.filter(inv =>
                filteredUsers.some(u => u.email === inv.email)
            );
            const filteredUserRoles = allUserRoles.filter(ur => filteredUserIds.has(ur.userId));

            // Delete existing invitations for these emails to avoid conflicts
            if (allEmails.length > 0) {
                await db.delete(schema.invitations as any)
                    .where(inArray(schema.invitations.email, allEmails) as any);
            }

            // Use filtered arrays
            allUsers.length = 0;
            allUsers.push(...filteredUsers);
            allInvitations.length = 0;
            allInvitations.push(...filteredInvitations);
            allUserRoles.length = 0;
            allUserRoles.push(...filteredUserRoles);
        }

        // Step 4: Batch insert all data with error handling
        const results = [];

        try {
            if (allTenants.length > 0) {
                await batchInsert(db, schema.tenants, allTenants);
                results.push(`Created ${allTenants.length} tenants`);
            }

            if (allSites.length > 0) {
                await batchInsert(db, schema.sites, allSites);
                results.push(`Created ${allSites.length} sites`);
            }

            if (allUsers.length > 0) {
                // Create accounts table entries for password auth
                const allAccounts = allUsers.map(u => ({
                    id: `acc_${crypto.randomUUID()}`,
                    userId: u.id,
                    accountId: u.email,
                    providerId: 'credential',
                    password: hashedPassword,
                    createdAt: now,
                    updatedAt: now,
                }));

                await batchInsert(db, schema.users, allUsers);
                await batchInsert(db, schema.accounts, allAccounts);
                results.push(`Created ${allUsers.length} users with credentials`);
            }

            if (allInvitations.length > 0) {
                await batchInsert(db, schema.invitations, allInvitations);
                results.push(`Created ${allInvitations.length} invitations`);
            }

            if (allUserRoles.length > 0) {
                await batchInsert(db, schema.userRoles, allUserRoles);
                results.push(`Created ${allUserRoles.length} user role assignments`);
            }
        } catch (error: any) {
            console.error("Seed database error:", error);
            throw new Error(`Failed to seed database: ${error.message || String(error)}`);
        }

        return {
            success: true,
            results,
            summary: {
                tenants: allTenants.length,
                sites: allSites.length,
                users: allUsers.length,
                skippedExisting: emailsToSkip.length
            }
        };
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
