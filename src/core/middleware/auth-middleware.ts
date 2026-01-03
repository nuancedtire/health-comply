import { createMiddleware } from "@tanstack/react-start";
import { dbMiddleware } from "./db-middleware";

export const authMiddleware = createMiddleware({
    type: "function",
})
    .middleware([dbMiddleware])
    .server(async ({ next }) => {
        // For MVP, we'll hardcode the user to the seeded admin user
        // In a real app, we'd check session cookies or tokens here via getWebRequest()

        // Check if db is available from previous middleware
        // const { db } = context;

        // Fetch the admin user to ensure context validity
        // We'll just define the user object statically for performance in this stub phase
        const user = {
            id: "user_admin",
            name: "Admin User",
            email: "admin@example.com",
            roleId: "role_pm"
        };

        return next({
            context: {
                user
            }
        });
    });
