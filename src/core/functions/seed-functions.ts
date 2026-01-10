
import { createServerFn } from "@tanstack/react-start";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "@/core/middleware/auth-middleware";

export const seedCqcTaxonomyFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;

        if (!(user as any).isSystemAdmin) {
            throw new Error("Unauthorized: Only System Admins can seed the CQC taxonomy.");
        }

        const results = [];

        // 1. Seed Evidence Categories
        const evidenceCategories = [
            { id: 'peoples_experience', title: "People's experience of health and care services" },
            { id: 'staff_feedback', title: 'Feedback from staff and leaders' },
            { id: 'partner_feedback', title: 'Feedback from partners' },
            { id: 'observation', title: 'Observation' },
            { id: 'processes', title: 'Processes' },
            { id: 'outcomes', title: 'Outcomes' },
        ];

        for (const category of evidenceCategories) {
            const existing = await db.select({ id: schema.evidenceCategories.id })
                .from(schema.evidenceCategories as any)
                .where(eq(schema.evidenceCategories.id, category.id) as any)
                .get();

            if (existing) {
                results.push(`Evidence category '${category.title}' already exists.`);
            } else {
                await db.insert(schema.evidenceCategories as any).values(category);
                results.push(`Created evidence category: ${category.title}`);
            }
        }

        // 2. Seed CQC Key Questions
        const keyQuestions = [
            { id: 'safe', title: 'Safe', displayOrder: 10 },
            { id: 'effective', title: 'Effective', displayOrder: 20 },
            { id: 'caring', title: 'Caring', displayOrder: 30 },
            { id: 'responsive', title: 'Responsive', displayOrder: 40 },
            { id: 'well_led', title: 'Well-led', displayOrder: 50 },
        ];

        for (const kq of keyQuestions) {
            const existing = await db.select({ id: schema.cqcKeyQuestions.id })
                .from(schema.cqcKeyQuestions as any)
                .where(eq(schema.cqcKeyQuestions.id, kq.id) as any)
                .get();

            if (existing) {
                results.push(`Key question '${kq.title}' already exists.`);
            } else {
                await db.insert(schema.cqcKeyQuestions as any).values(kq);
                results.push(`Created key question: ${kq.title}`);
            }
        }

        // 3. Seed Quality Statements
        const qualityStatements = [
            // Safe
            { id: 'safe.learning_culture', keyQuestionId: 'safe', code: 'learning-culture', title: 'Learning culture', displayOrder: 1 },
            { id: 'safe.safeguarding', keyQuestionId: 'safe', code: 'safeguarding', title: 'Safeguarding', displayOrder: 2 },
            { id: 'safe.involving_people_to_manage_risks', keyQuestionId: 'safe', code: 'involving-people-to-manage-risks', title: 'Involving people to manage risks', displayOrder: 3 },
            { id: 'safe.safe_environments', keyQuestionId: 'safe', code: 'safe-environments', title: 'Safe environments', displayOrder: 4 },
            { id: 'safe.infection_prevention_and_control', keyQuestionId: 'safe', code: 'infection-prevention-and-control', title: 'Infection prevention and control', displayOrder: 5 },
            { id: 'safe.medicines_optimisation', keyQuestionId: 'safe', code: 'medicines-optimisation', title: 'Medicines optimisation', displayOrder: 6 },

            // Effective
            { id: 'effective.assessing_needs', keyQuestionId: 'effective', code: 'assessing-needs', title: 'Assessing needs', displayOrder: 1 },
            { id: 'effective.delivering_evidence_based_care', keyQuestionId: 'effective', code: 'delivering-evidence-based-care-and-treatment', title: 'Delivering evidence-based care and treatment', displayOrder: 2 },
            { id: 'effective.how_staff_teams_work_together', keyQuestionId: 'effective', code: 'how-staff-teams-and-services-work-together', title: 'How staff, teams and services work together', displayOrder: 3 },
            { id: 'effective.supporting_healthier_lives', keyQuestionId: 'effective', code: 'supporting-people-to-live-healthier-lives', title: 'Supporting people to live healthier lives', displayOrder: 4 },
            { id: 'effective.monitoring_and_improving_outcomes', keyQuestionId: 'effective', code: 'monitoring-and-improving-outcomes', title: 'Monitoring and improving outcomes', displayOrder: 5 },
            { id: 'effective.consent_to_care', keyQuestionId: 'effective', code: 'consent-to-care-and-treatment', title: 'Consent to care and treatment', displayOrder: 6 },

            // Caring
            { id: 'caring.kindness_compassion_dignity', keyQuestionId: 'caring', code: 'kindness-compassion-and-dignity', title: 'Kindness, compassion and dignity', displayOrder: 1 },
            { id: 'caring.treating_people_as_individuals', keyQuestionId: 'caring', code: 'treating-people-as-individuals', title: 'Treating people as individuals', displayOrder: 2 },
            { id: 'caring.independence_choice_control', keyQuestionId: 'caring', code: 'independence-choice-and-control', title: 'Independence, choice and control', displayOrder: 3 },
            { id: 'caring.responding_to_immediate_needs', keyQuestionId: 'caring', code: 'responding-to-peoples-immediate-needs', title: "Responding to people's immediate needs", displayOrder: 4 },
            { id: 'caring.workforce_wellbeing_enablement', keyQuestionId: 'caring', code: 'workforce-wellbeing-and-enablement', title: 'Workforce wellbeing and enablement', displayOrder: 5 },

            // Responsive
            { id: 'responsive.person_centred_care', keyQuestionId: 'responsive', code: 'person-centred-care', title: 'Person-centred care', displayOrder: 1 },
            { id: 'responsive.providing_information', keyQuestionId: 'responsive', code: 'providing-information', title: 'Providing information', displayOrder: 2 },
            { id: 'responsive.listening_involving_people', keyQuestionId: 'responsive', code: 'listening-to-and-involving-people', title: 'Listening to and involving people', displayOrder: 3 },
            { id: 'responsive.planning_for_the_future', keyQuestionId: 'responsive', code: 'planning-for-the-future', title: 'Planning for the future', displayOrder: 4 },

            // Well-led
            { id: 'well_led.shared_direction_and_culture', keyQuestionId: 'well_led', code: 'shared-direction-and-culture', title: 'Shared direction and culture', displayOrder: 1 },
            { id: 'well_led.capable_compassionate_inclusive_leaders', keyQuestionId: 'well_led', code: 'capable-compassionate-and-inclusive-leaders', title: 'Capable, compassionate and inclusive leaders', displayOrder: 2 },
            { id: 'well_led.freedom_to_speak_up', keyQuestionId: 'well_led', code: 'freedom-to-speak-up', title: 'Freedom to speak up', displayOrder: 3 },
            { id: 'well_led.governance_management_sustainability', keyQuestionId: 'well_led', code: 'governance-management-and-sustainability', title: 'Governance, management and sustainability', displayOrder: 4 },
            { id: 'well_led.learning_improvement_innovation', keyQuestionId: 'well_led', code: 'learning-improvement-and-innovation', title: 'Learning, improvement and innovation', displayOrder: 5 },
            { id: 'well_led.environmental_sustainability', keyQuestionId: 'well_led', code: 'environmental-sustainability', title: 'Environmental sustainability', displayOrder: 6 },
        ];

        for (const qs of qualityStatements) {
            const existing = await db.select({ id: schema.cqcQualityStatements.id })
                .from(schema.cqcQualityStatements as any)
                .where(eq(schema.cqcQualityStatements.id, qs.id) as any)
                .get();

            if (existing) {
                results.push(`Quality statement '${qs.title}' already exists.`);
            } else {
                await db.insert(schema.cqcQualityStatements as any).values(qs);
                results.push(`Created quality statement: ${qs.title}`);
            }
        }

        const summary = {
            evidenceCategories: evidenceCategories.length,
            keyQuestions: keyQuestions.length,
            qualityStatements: qualityStatements.length,
        };

        return { success: true, results, summary };
    });

export const resetCqcTaxonomyFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;

        if (!(user as any).isSystemAdmin) {
            throw new Error("Unauthorized: Only System Admins can reset the CQC taxonomy.");
        }

        try {
            await db.delete(schema.cqcQualityStatements as any);
            await db.delete(schema.cqcKeyQuestions as any);
            await db.delete(schema.evidenceCategories as any);
            return { success: true, message: "CQC Taxonomy reset successfully." };
        } catch (error: any) {
            console.error("Failed to reset CQC taxonomy:", error);
            // Check for foreign key constraint errors (SQLITE_CONSTRAINT)
            if (error.message?.includes('FOREIGN KEY constraint failed') || error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                throw new Error("Cannot reset CQC taxonomy because operational data (Policies, Evidence, etc.) still exists. Please 'Reset Database' first.");
            }
            throw error;
        }
    });

export const seedDatabaseFn = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async (ctx) => {
        const { db, user } = ctx.context;

        if (!(user as any).isSystemAdmin) {
            throw new Error("Unauthorized: Only System Admins can seed the database.");
        }

        const { createAuth } = await import("@/lib/auth");
        // We need 'request' to pass to auth, but usually signUpEmail doesn't need headers if we don't care about session creation for the new user in this context. 
        // However, better-auth might need it for some checks. passing empty object might work or ctx.request if available. 
        // authMiddleware doesn't pass 'request' in context, but we can access it if we added it. 
        // authMiddleware source: "const request = (context as any).request;" but it returns "db, user, session". 
        // I can just pass a dummy request or try without. 
        const auth = createAuth(db);

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
                    { email: "admin@rural.com", name: "David Admin", role: "Practice Manager" },
                    { email: "gp@rural.com", name: "Dr. Eve GP", role: "GP Partner", siteIndex: 0 },
                    { email: "partner@rural.com", name: "Dr. Frank Partner", role: "GP Partner", siteIndex: 1 },
                    { email: "nurse@rural.com", name: "Grace Nurse", role: "Nurse Lead", siteIndex: 0 },
                    { email: "staff@rural.com", name: "Henry Staff", role: "Receptionist", siteIndex: 0 }
                ]
            },
            {
                name: "Metropolitan Medical",
                sites: ["Central Hospital", "East Wing Clinic", "West Wing Clinic"],
                users: [
                    { email: "ceo@metromed.com", name: "Julian CEO", role: "Practice Manager" },
                    { email: "medical_director@metromed.com", name: "Dr. Kevin Director", role: "GP Partner", siteIndex: 0 },
                    { email: "lead_nurse@metromed.com", name: "Laura Lead", role: "Nurse Lead", siteIndex: 0 },
                    { email: "clinician@metromed.com", name: "Mike Clinician", role: "Clinician", siteIndex: 1 },
                    { email: "hq_safeguarding@metromed.com", name: "Nina Safe", role: "Safeguarding Lead", siteIndex: 0 },
                    { email: "site_rep@metromed.com", name: "Oscar East", role: "Receptionist", siteIndex: 1 }
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
