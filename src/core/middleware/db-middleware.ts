import { createMiddleware } from "@tanstack/react-start";

import { getDb } from "@/db";

export const dbMiddleware = createMiddleware({
    type: "function",
}).server(async ({ next, context }) => {

    // @ts-ignore - env should be in context from server.ts
    const env = context?.env || globalThis.env || process.env;

    console.log("DB Middleware Env Keys:", env ? Object.keys(env) : "env is undefined");

    // If env.DB is not available (e.g. not in worker), this might fail or we need a fallback.
    let db;
    if (!env?.DB) {
        console.warn("DB binding not found in environment, using shim for build/dev");
        // Shim for build/dev where D1 might not be bound yet
        const d1Shim = {
            prepare: () => ({ bind: () => ({ all: async () => [], run: async () => ({}), first: async () => null, get: async () => null }) })
        } as any;
        db = getDb(d1Shim);
    } else {
        console.log("DB binding found");
        db = getDb(env.DB);
    }

    return next({
        context: {
            db,
            env
        },
    });
});
