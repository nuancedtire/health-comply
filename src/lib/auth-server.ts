import { sessionMiddleware } from "@/core/middleware/session-middleware";
import { createServerFn } from "@tanstack/react-start";

export const getUser = createServerFn({ method: "GET" })
    .middleware([sessionMiddleware])
    .handler(async ({ context }) => {
        return {
            user: context.user,
            session: context.session
        }
    });
