import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from '@/db/schema';
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import type { Env } from "@/utils/env";
import { hashPassword, verifyPassword } from "@/lib/password";


export const createAuth = (db: any, env: Env, options?: {
    sendResetPassword?: (data: any, request: any) => Promise<void>
}) => {
    // Parse trusted origins from environment variable (comma-separated)
    const trustedOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS
        ? env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(origin => origin.trim())
        : [];
    trustedOrigins.push(
        "http://localhost:3000",
        "http://localhost:3100",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3100",
    );
    const resolvedTrustedOrigins = Array.from(new Set(trustedOrigins.filter(Boolean)));

    return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: resolvedTrustedOrigins.length > 0 ? resolvedTrustedOrigins : undefined,
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: {
            ...schema,
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
            invitation: schema.invitations
        }
    }),
    emailAndPassword: {
        enabled: true,
        // Use PBKDF2 instead of scrypt to stay within Cloudflare Workers CPU limits
        // Default scrypt takes ~80ms, PBKDF2 takes ~5-10ms
        password: {
            hash: hashPassword,
            verify: verifyPassword,
        },
        async sendResetPassword(data, request) {
            if (options?.sendResetPassword) {
                await options.sendResetPassword(data, request);
                return;
            }
            // In a real app, send email here.
            // For dev/demo, we log it or you can store it in a temporary table if strictly needed.
            // but usually logging to console is enough for local dev.
            console.log("----------------------------------------");
            console.log("Password Reset Link:");
            console.log(data.url);
            console.log("Token:", data.token);
            console.log("----------------------------------------");
        }
    },
    // tanstackStartCookies must be the last plugin for proper cookie handling
    plugins: [tanstackStartCookies()],
    user: {
        fields: {
            isSystemAdmin: "is_system_admin",
            tenantId: "tenant_id"
        },
        additionalFields: {
            isSystemAdmin: {
                type: "boolean",
                required: false,
                defaultValue: false
            },
            tenantId: {
                type: "string",
                required: false
            }
        }
    } as any,
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    // Check if this is the first user
                    const existingUsers = await db.select({ count: schema.users.id }).from(schema.users).limit(1);
                    if (existingUsers.length === 0) {
                        return {
                            data: {
                                ...user,
                                isSystemAdmin: true
                            }
                        };
                    }

                    // Check for invitation
                    const invite = await db.query.invitations.findFirst({
                        where: (inv: any, { eq, and }: any) => and(
                            eq(inv.email, user.email),
                            eq(inv.status, 'pending')
                        )
                    });

                    if (!invite) {
                        throw new APIError("BAD_REQUEST", {
                            message: "Registration is by invitation only."
                        });
                    }

                    // Allow creation (return nothing or original data)
                    return { data: user };
                },
                after: async (user) => {
                    if (user.isSystemAdmin) return;

                    // Find the invite again
                    const invite = await db.query.invitations.findFirst({
                        where: (inv: any, { eq, and }: any) => and(
                            eq(inv.email, user.email),
                            eq(inv.status, 'pending')
                        )
                    });

                    if (invite) {
                        // Assign Tenant & Role
                        await db.update(schema.users)
                            .set({ tenantId: invite.tenantId })
                            .where(eq(schema.users.id, user.id));

                        const userRoleVal = {
                            userId: user.id,
                            role: invite.role, // Use role string
                            siteId: invite.siteId,
                            createdAt: new Date(),
                        };
                        await db.insert(schema.userRoles).values(userRoleVal);

                        // Mark invite accepted
                        await db.update(schema.invitations)
                            .set({ status: 'accepted' })
                            .where(eq(schema.invitations.id, invite.id));
                    }
                }
            }
        }
    }
});
};

export type Auth = ReturnType<typeof createAuth>;
