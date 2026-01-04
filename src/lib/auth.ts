import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from '@/db/schema';
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";

export const createAuth = (db: any) => betterAuth({
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
    },
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
                            roleId: invite.roleId,
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

export type Auth = ReturnType<typeof createAuth>;
