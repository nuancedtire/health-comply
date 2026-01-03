import { createServerFn } from '@tanstack/react-start';
import { setCookie, deleteCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { dbMiddleware } from '../middleware/db-middleware';
import * as schema from '../../db/schema';
import { verifyPassword } from '../../lib/auth';

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// const SignupSchema = z.object({
// email: z.string().email(),
// password: z.string().min(8),
// name: z.string().min(1),
// tenantName: z.string().min(1),
// });

const SESSION_COOKIE_NAME = 'cqc_session';

export const loginFn = createServerFn({ method: "POST" })
    .middleware([dbMiddleware])
    .inputValidator((data: unknown) => LoginSchema.parse(data))
    .handler(async ({ data, context }: { data: z.infer<typeof LoginSchema>, context: any }) => {
        const { db } = context;
        const { email, password } = data;

        // 1. Find user
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, email),
            with: {
                tenant: true,
                roles: true,
            }
        });

        if (!user || !user.passwordHash) {
            throw new Error("Invalid credentials");
        }

        // 2. Verify password
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
            throw new Error("Invalid credentials");
        }

        // 3. Get primary role & site
        const primaryRole = user.roles[0];
        const roleId = primaryRole?.roleId;
        const siteId = primaryRole?.siteId || 's_demo';

        // 4. Create Session
        const sessionPayload = {
            userId: user.id,
            tenantId: user.tenantId,
            siteId: siteId,
            roleId: roleId,
            email: user.email,
            name: user.name,
        };

        // Using simple base64 for MVP - replace with sealed-session in production if needed
        const sessionStr = btoa(JSON.stringify(sessionPayload));

        setCookie(SESSION_COOKIE_NAME, sessionStr, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });

        // Update last login
        await db.update(schema.users)
            .set({ lastLoginAt: Math.floor(Date.now() / 1000) })
            .where(eq(schema.users.id, user.id));

        return { success: true, user: sessionPayload };
    });

export const logoutFn = createServerFn({ method: "POST" })
    .handler(async () => {
        deleteCookie(SESSION_COOKIE_NAME, { path: '/' });
        return { success: true };
    });
