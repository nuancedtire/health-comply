import { createServerFn } from "@tanstack/react-start";
import type { Env } from "@/utils/env";

export const getEmailConfigurationFn = createServerFn({ method: "GET" })
    .handler(async (ctx) => {
        const env = (ctx.context as any)?.env as Env | undefined;

        return {
            resendConfigured: Boolean(env?.RESEND_API_KEY),
        };
    });
