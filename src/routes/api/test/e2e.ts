import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Env } from "@/utils/env";
import {
    cleanupE2EArtifacts,
    clearCapturedEmails,
    getCapturedEmails,
    getE2ETestSecret,
    getEffectiveResendMode,
    isE2ETestMode,
    resetE2EState,
    setE2EResendMode,
} from "@/lib/e2e-test-support";

const PostBodySchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("set-mode"),
        mode: z.enum(["configured", "missing", "failing"]),
    }),
    z.object({
        action: z.literal("clear-emails"),
    }),
    z.object({
        action: z.literal("reset-state"),
    }),
    z.object({
        action: z.literal("cleanup-run"),
        runId: z.string().min(1),
    }),
]);

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json",
        },
    });
}

function authorize(request: Request, env: Env) {
    const hostname = new URL(request.url).hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isE2ETestMode(env) && !isLocalhost) {
        return json({ error: "Not found" }, 404);
    }

    const expectedSecret = getE2ETestSecret(env) || "local-e2e-secret";
    if (!expectedSecret || request.headers.get("x-e2e-test-secret") !== expectedSecret) {
        return json({ error: "Unauthorized" }, 401);
    }

    return null;
}

export const Route = createFileRoute("/api/test/e2e")({
    server: {
        handlers: {
            GET: async ({ request, context }: { request: Request; context: any }) => {
                const env = context.env as Env;
                const authError = authorize(request, env);
                if (authError) {
                    return authError;
                }

                const url = new URL(request.url);
                const runId = url.searchParams.get("runId");
                const emails = (await getCapturedEmails(env))
                    .filter((email) => !runId || email.to.includes(runId) || email.url.includes(runId));

                return json({
                    resendMode: await getEffectiveResendMode(env),
                    emails,
                });
            },
            POST: async ({ request, context }: { request: Request; context: any }) => {
                const env = context.env as Env;
                const authError = authorize(request, env);
                if (authError) {
                    return authError;
                }

                const body = PostBodySchema.parse(await request.json());

                if (body.action === "set-mode") {
                    await setE2EResendMode(env, body.mode);
                    return json({
                        resendMode: await getEffectiveResendMode(env),
                    });
                }

                if (body.action === "clear-emails") {
                    await clearCapturedEmails(env);
                    return json({ success: true });
                }

                if (body.action === "reset-state") {
                    await resetE2EState(env);
                    return json({
                        resendMode: await getEffectiveResendMode(env),
                        success: true,
                    });
                }

                const cleanup = await cleanupE2EArtifacts(env, body.runId);
                return json({
                    success: true,
                    cleanup,
                });
            },
        },
    },
});
