import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "@/lib/auth";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import type { Env } from "@/utils/env";

export const Route = createFileRoute("/api/auth/$")({
    server: {
        handlers: {
            GET: async ({ request, context }: { request: Request; context: any }) => {
                const env = context.env as Env;
                if (!env || !env.DB) {
                    return new Response("Database binding missing", { status: 500 });
                }
                const db = drizzle(env.DB, { schema });
                const auth = createAuth(db, env);
                return auth.handler(request);
            },
            POST: async ({ request, context }: { request: Request; context: any }) => {
                const env = context.env as Env;
                if (!env || !env.DB) {
                    return new Response("Database binding missing", { status: 500 });
                }
                const db = drizzle(env.DB, { schema });
                const auth = createAuth(db, env);
                return auth.handler(request);
            },
        },
    },
});
