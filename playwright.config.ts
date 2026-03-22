import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const e2eSecret = process.env.E2E_TEST_SECRET || "local-e2e-secret";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const url = new URL(baseURL);
const port = url.port || (url.protocol === "https:" ? "443" : "80");

export default defineConfig({
    testDir: path.join(currentDir, "tests/e2e"),
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    reporter: [["list"], ["html", { open: "never" }]],
    timeout: 90_000,
    expect: {
        timeout: 10_000,
    },
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    webServer: {
        command: `pnpm exec vite dev --port ${port}`,
        url: `${baseURL}/login`,
        reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true",
        timeout: 120_000,
        env: {
            ...process.env,
            BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS || baseURL,
            BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || baseURL,
            CLOUDFLARE_INSPECTOR_PORT: "false",
            CLOUDFLARE_REMOTE_BINDINGS: "false",
            E2E_TEST_MODE: "true",
            E2E_TEST_SECRET: e2eSecret,
            E2E_RESEND_MODE: process.env.E2E_RESEND_MODE || "missing",
        },
    },
    projects: [
        {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
        },
        {
            name: "chromium",
            dependencies: ["setup"],
        },
    ],
});
