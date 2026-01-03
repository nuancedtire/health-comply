
// src/core/middleware/auth-middleware.ts
import { createMiddleware } from '@tanstack/react-start';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import { parseCookies } from '../../lib/cookie';

export type Session = {
    userId: string;
    tenantId: string;
    siteId?: string;
    role: string;
};

type Env = Cloudflare.Env;

export const authMiddleware = createMiddleware().server(async ({ next, context }) => {
    // @ts-ignore
    const request = context.request as Request;
    // @ts-ignore
    const env = context.env as Env;

    // Fallback
    if (!request || !env) {
        // In some environments, request might be missing? 
        // Ensure we return null session
        return next({
            context: {
                session: null as Session | null,
                db: env?.DB ? drizzle(env.DB, { schema }) : null as any,
            }
        });
    }

    const db = drizzle(env.DB, { schema });
    const cookieHeader = request.headers.get('Cookie');
    const cookies = parseCookies(cookieHeader);
    const sessionCookie = cookies['session'];

    if (!sessionCookie) {
        return next({
            context: {
                session: null as Session | null,
                db,
            },
        });
    }

    try {
        const sessionData = JSON.parse(atob(sessionCookie)) as Session;
        return next({
            context: {
                session: sessionData,
                db,
            }
        });
    } catch (e) {
        return next({
            context: {
                session: null as Session | null,
                db,
            },
        });
    }
});
