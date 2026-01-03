
// src/core/middleware/db-middleware.ts
import { createMiddleware } from '@tanstack/react-start';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';

// Define Env interface locally
interface Env extends Cloudflare.Env { }

export const dbMiddleware = createMiddleware().server(async ({ next, context }) => {
    // @ts-ignore
    const env = context.env as Env;

    // Log for debugging
    if (env) {
        console.log("DB Middleware Env Keys:", Object.keys(env));
    } else {
        console.error("DB Middleware: Env is missing!");
    }

    if (!env?.DB) {
        console.error("DB Binding missing");
        throw new Error("DB Binding missing");
    }

    const db = drizzle(env.DB, { schema });

    return next({
        context: {
            db,
        }
    });
});
