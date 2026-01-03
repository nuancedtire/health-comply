
// src/core/functions/auth.server.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../../lib/auth';
import type { Session } from '../middleware/auth-middleware';
import { serializeCookie } from '../../lib/cookie';

// Re-export Session type or import shared one
// For now, assuming Env is global or we cast context.env
type Env = Cloudflare.Env;

export const loginFn = createServerFn({ method: 'POST' })
    .inputValidator((data: unknown) => {
        return z.object({
            email: z.string().email(),
            password: z.string(),
        }).parse(data);
    })
    .handler(async ({ data: { email, password }, context }) => {
        // @ts-ignore - env access via context from middleware/server entry
        const env = context.env as Env;
        if (!env || !env.DB) {
            throw new Error("Database binding not found");
        }

        const db = drizzle(env.DB, { schema });

        // 1. Find user
        const [user] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email))
            .limit(1);

        if (!user) {
            // Timing attack mitigation: simulate verify
            await verifyPassword("dummy", "pbkdf2_sha256$100000$dummy$dummy");
            throw new Error("Invalid credentials");
        }

        // 2. Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            throw new Error("Invalid credentials");
        }

        // 3. Get roles (simplistic: primary role or list)
        const userRoles = await db
            .select({
                roleName: schema.roles.name,
                siteId: schema.userRoles.siteId
            })
            .from(schema.userRoles)
            .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
            .where(eq(schema.userRoles.userId, user.id));

        // Pick the first role for the session "primary role" (simplified)
        const primaryRole = userRoles[0]?.roleName || 'Viewer';
        const primarySiteId = userRoles[0]?.siteId || undefined;

        // 4. Create Session Object
        const session: Session = {
            userId: user.id,
            tenantId: user.tenantId,
            siteId: primarySiteId || undefined,
            role: primaryRole,
        };

        // 5. Serialize Cookie
        const cookieValue = btoa(JSON.stringify(session));
        const serialized = serializeCookie('session', cookieValue, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        // 6. Update last login
        await db.update(schema.users)
            .set({ lastLoginAt: Math.floor(Date.now() / 1000) })
            .where(eq(schema.users.id, user.id));

        // 7. Return Response with Header
        return new Response(JSON.stringify({ success: true, user: { name: user.name, email: user.email } }), {
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': serialized
            }
        });
    });

export const logoutFn = createServerFn({ method: "POST" })
    .handler(async () => {
        const serialized = serializeCookie('session', '', {
            maxAge: 0,
            path: '/'
        });
        return new Response(JSON.stringify({ success: true }), {
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': serialized
            }
        });
    });

export const getSessionFn = createServerFn({ method: "GET" })
    .handler(async ({ context }) => {
        // @ts-ignore
        const session = context.session as Session | null;
        return { session };
    });
