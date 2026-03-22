import { drizzle } from "drizzle-orm/d1";
import { eq, inArray, like } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { Env } from "@/utils/env";

export type E2EResendMode = "configured" | "missing" | "failing";
export type E2EEmailKind = "invitation" | "password-reset";
export type E2EEmailStatus = "sent" | "failed";

export interface CapturedE2EEmail {
    id: string;
    kind: E2EEmailKind;
    status: E2EEmailStatus;
    to: string;
    subject: string;
    url: string;
    token?: string;
    error?: string | null;
    createdAt: string;
}

const DEFAULT_TENANT_PREFIX = "E2E ";
const EMAIL_IDENTIFIER_PREFIX = "__e2e__:email:";
const MODE_IDENTIFIER = "__e2e__:resend-mode";
const FORCED_RESEND_FAILURE = "E2E forced Resend failure.";

function getDb(env: Env) {
    return drizzle(env.DB, { schema: schema as any }) as any;
}

function getFallbackMode(env: Env | undefined): E2EResendMode {
    return env?.RESEND_API_KEY ? "configured" : "missing";
}

function getModeExpiresAt() {
    return new Date(Date.now() + 1000 * 60 * 60 * 24);
}

function getEmailExpiresAt() {
    return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
}

export function isE2ETestMode(env: Env | undefined): boolean {
    return env?.E2E_TEST_MODE === "true";
}

export function getE2ETestSecret(env: Env | undefined): string | undefined {
    return env?.E2E_TEST_SECRET;
}

async function readModeOverride(env: Env | undefined): Promise<E2EResendMode | undefined> {
    if (!env?.DB) {
        return undefined;
    }

    const db = getDb(env);
    const modeRow = await db.select({ value: schema.verifications.value })
        .from(schema.verifications)
        .where(eq(schema.verifications.identifier, MODE_IDENTIFIER))
        .get();

    if (!modeRow?.value) {
        return undefined;
    }

    const mode = modeRow.value as E2EResendMode;
    return mode === "configured" || mode === "missing" || mode === "failing"
        ? mode
        : undefined;
}

export async function getEffectiveResendMode(env: Env | undefined): Promise<E2EResendMode> {
    if (!env) {
        return "missing";
    }

    const modeOverride = await readModeOverride(env);
    if (modeOverride) {
        return modeOverride;
    }

    if (!isE2ETestMode(env)) {
        return getFallbackMode(env);
    }

    return env.E2E_RESEND_MODE || getFallbackMode(env);
}

export async function isResendConfiguredForUi(env: Env | undefined): Promise<boolean> {
    return (await getEffectiveResendMode(env)) !== "missing";
}

export async function setE2EResendMode(env: Env, mode: E2EResendMode) {
    const db = getDb(env);

    await db.delete(schema.verifications)
        .where(eq(schema.verifications.identifier, MODE_IDENTIFIER));

    await db.insert(schema.verifications).values({
        id: crypto.randomUUID(),
        identifier: MODE_IDENTIFIER,
        value: mode,
        expiresAt: getModeExpiresAt(),
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

export async function clearCapturedEmails(env: Env) {
    const db = getDb(env);
    await db.delete(schema.verifications)
        .where(like(schema.verifications.identifier, `${EMAIL_IDENTIFIER_PREFIX}%`));
}

export async function resetE2EState(env: Env) {
    const db = getDb(env);
    await clearCapturedEmails(env);
    await db.delete(schema.verifications)
        .where(eq(schema.verifications.identifier, MODE_IDENTIFIER));
}

export async function getCapturedEmails(env: Env): Promise<CapturedE2EEmail[]> {
    const db = getDb(env);
    const rows = await db.select({
        id: schema.verifications.id,
        value: schema.verifications.value,
        createdAt: schema.verifications.createdAt,
    })
        .from(schema.verifications)
        .where(like(schema.verifications.identifier, `${EMAIL_IDENTIFIER_PREFIX}%`));

    return rows
        .map((row: { id: string; value: string; createdAt: Date | null }) => {
            const parsed = JSON.parse(row.value) as Omit<CapturedE2EEmail, "id" | "createdAt">;
            return {
                id: row.id,
                createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
                ...parsed,
            };
        })
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function captureEmail(env: Env | undefined, email: Omit<CapturedE2EEmail, "id" | "createdAt">) {
    if (!env?.DB) {
        return;
    }

    const db = getDb(env);
    await db.insert(schema.verifications).values({
        id: crypto.randomUUID(),
        identifier: `${EMAIL_IDENTIFIER_PREFIX}${crypto.randomUUID()}`,
        value: JSON.stringify(email),
        expiresAt: getEmailExpiresAt(),
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

export async function deliverInvitationEmailForEnvironment(
    env: Env | undefined,
    delivery: {
        to: string;
        subject: string;
        url: string;
        token: string;
        send: () => Promise<void>;
    },
) {
    const mode = await getEffectiveResendMode(env);

    if (mode === "missing") {
        return {
            configured: false,
            sent: false,
            error: null as string | null,
        };
    }

    if (isE2ETestMode(env)) {
        if (mode === "failing") {
            await captureEmail(env, {
                kind: "invitation",
                status: "failed",
                to: delivery.to,
                subject: delivery.subject,
                url: delivery.url,
                token: delivery.token,
                error: FORCED_RESEND_FAILURE,
            });

            return {
                configured: true,
                sent: false,
                error: FORCED_RESEND_FAILURE,
            };
        }

        await captureEmail(env, {
            kind: "invitation",
            status: "sent",
            to: delivery.to,
            subject: delivery.subject,
            url: delivery.url,
            token: delivery.token,
            error: null,
        });

        return {
            configured: true,
            sent: true,
            error: null as string | null,
        };
    }

    try {
        await delivery.send();
        return {
            configured: true,
            sent: true,
            error: null as string | null,
        };
    } catch (error) {
        return {
            configured: true,
            sent: false,
            error: error instanceof Error ? error.message : "Unknown email delivery error.",
        };
    }
}

export async function deliverPasswordResetEmailForEnvironment(
    env: Env | undefined,
    delivery: {
        to: string;
        subject: string;
        url: string;
        token: string;
        send: () => Promise<void>;
    },
) {
    const mode = await getEffectiveResendMode(env);

    if (mode === "missing") {
        return {
            configured: false,
            sent: false,
            error: null as string | null,
        };
    }

    if (isE2ETestMode(env)) {
        if (mode === "failing") {
            await captureEmail(env, {
                kind: "password-reset",
                status: "failed",
                to: delivery.to,
                subject: delivery.subject,
                url: delivery.url,
                token: delivery.token,
                error: FORCED_RESEND_FAILURE,
            });

            return {
                configured: true,
                sent: false,
                error: FORCED_RESEND_FAILURE,
            };
        }

        await captureEmail(env, {
            kind: "password-reset",
            status: "sent",
            to: delivery.to,
            subject: delivery.subject,
            url: delivery.url,
            token: delivery.token,
            error: null,
        });

        return {
            configured: true,
            sent: true,
            error: null as string | null,
        };
    }

    try {
        await delivery.send();
        return {
            configured: true,
            sent: true,
            error: null as string | null,
        };
    } catch (error) {
        return {
            configured: true,
            sent: false,
            error: error instanceof Error ? error.message : "Unknown email delivery error.",
        };
    }
}

async function deleteUserCascade(db: any, userId: string) {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await db.delete(schema.accounts).where(eq(schema.accounts.userId, userId));
    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
}

async function deleteTenantCascade(db: any, tenantId: string) {
    await db.delete(schema.evidenceLinks as any).where(eq(schema.evidenceLinks.tenantId, tenantId) as any);
    await db.delete(schema.evidenceItems as any).where(eq(schema.evidenceItems.tenantId, tenantId) as any);
    await db.delete(schema.policyReadAttestations as any).where(eq(schema.policyReadAttestations.tenantId, tenantId) as any);
    await db.delete(schema.policyApprovals as any).where(eq(schema.policyApprovals.tenantId, tenantId) as any);
    await db.delete(schema.policyVersions as any).where(eq(schema.policyVersions.tenantId, tenantId) as any);
    await db.delete(schema.policies as any).where(eq(schema.policies.tenantId, tenantId) as any);
    await db.delete(schema.actionApprovals as any).where(eq(schema.actionApprovals.tenantId, tenantId) as any);
    await db.delete(schema.actions as any).where(eq(schema.actions.tenantId, tenantId) as any);
    await db.delete(schema.inspectionPackOutputs as any).where(eq(schema.inspectionPackOutputs.tenantId, tenantId) as any);
    await db.delete(schema.inspectionPacks as any).where(eq(schema.inspectionPacks.tenantId, tenantId) as any);
    await db.delete(schema.qsOwners as any).where(eq(schema.qsOwners.tenantId, tenantId) as any);
    await db.delete(schema.localControls as any).where(eq(schema.localControls.tenantId, tenantId) as any);
    await db.delete(schema.invitations as any).where(eq(schema.invitations.tenantId, tenantId) as any);

    const tenantUsers = await db.select({ id: schema.users.id })
        .from(schema.users as any)
        .where(eq(schema.users.tenantId, tenantId) as any);
    const userIds = tenantUsers.map((user: { id: string }) => user.id);

    if (userIds.length > 0) {
        await db.delete(schema.sessions as any).where(inArray(schema.sessions.userId, userIds) as any);
        await db.delete(schema.accounts as any).where(inArray(schema.accounts.userId, userIds) as any);
        await db.delete(schema.userRoles as any).where(inArray(schema.userRoles.userId, userIds) as any);
    }

    await db.delete(schema.users as any).where(eq(schema.users.tenantId, tenantId) as any);
    await db.delete(schema.sites as any).where(eq(schema.sites.tenantId, tenantId) as any);
    await db.delete(schema.tenants as any).where(eq(schema.tenants.id, tenantId) as any);
}

export async function cleanupE2EArtifacts(env: Env, runId: string) {
    const db = getDb(env);
    const emailPattern = `%${runId}%`;
    const tenantPattern = `${DEFAULT_TENANT_PREFIX}${runId}%`;

    const testTenants = await db.select({ id: schema.tenants.id })
        .from(schema.tenants)
        .where(like(schema.tenants.name, tenantPattern));

    for (const tenant of testTenants) {
        await deleteTenantCascade(db, tenant.id);
    }

    await db.delete(schema.invitations).where(like(schema.invitations.email, emailPattern));
    await db.delete(schema.verifications).where(like(schema.verifications.identifier, emailPattern));
    await db.delete(schema.verifications).where(like(schema.verifications.value, `%${runId}%`));

    const testUsers = await db.select({ id: schema.users.id })
        .from(schema.users)
        .where(like(schema.users.email, emailPattern));

    for (const user of testUsers) {
        await deleteUserCascade(db, user.id);
    }

    return {
        deletedTenantIds: testTenants.map((tenant: { id: string }) => tenant.id),
        deletedUserIds: testUsers.map((user: { id: string }) => user.id),
        runId,
    };
}
