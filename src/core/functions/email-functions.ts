import { createServerFn } from "@tanstack/react-start";
import { isResendConfiguredForUi } from "@/lib/e2e-test-support";
import type { Env } from "@/utils/env";

export const getEmailConfigurationFn = createServerFn({ method: "GET" })
    .handler(async (ctx) => {
        const env = (ctx.context as any)?.env as Env | undefined;

        return {
            resendConfigured: await isResendConfiguredForUi(env),
        };
    });
