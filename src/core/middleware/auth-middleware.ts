import { createMiddleware } from "@tanstack/react-start";

import { createAuth } from "@/lib/auth";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import { APIError } from "better-auth/api";

export const authMiddleware = createMiddleware({
    type: "function",
}).server(async ({ next, context }) => {
    // Access env and request from the global context passed in src/server.ts
    const env = (context as any).env;
    const request = (context as any).request;

    if (!env || !env.DB) {
        throw new Error("Database binding (env.DB) is missing in context.");
    }

    const db = drizzle(env.DB, { schema: schema });
    const auth = createAuth(db);

    // Validate session using the request headers
    const sessionData = await auth.api.getSession({
        headers: request.headers
    });

    if (!sessionData) {
        throw new APIError("UNAUTHORIZED", { message: "Unauthorized" });
    }

    return next({
        context: {
            user: sessionData.user,
            session: sessionData.session,
            db // Pass properly initialized DB instance too
        }
    });
});
