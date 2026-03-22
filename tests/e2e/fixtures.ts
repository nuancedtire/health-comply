import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test as base } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(currentDir, ".auth");
export const managerStorageStatePath = path.join(authDir, "manager.json");
export const superAdminStorageStatePath = path.join(authDir, "super-admin.json");

export interface E2EApiClient {
    cleanup(runId: string): Promise<void>;
    clearEmails(): Promise<void>;
    getEmails(runId?: string): Promise<any[]>;
    resetState(): Promise<void>;
    setMode(mode: "configured" | "missing" | "failing"): Promise<void>;
}

type Fixtures = {
    e2e: E2EApiClient;
    managerPage: Page;
    runId: string;
    superAdminPage: Page;
};

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const e2eSecret = process.env.E2E_TEST_SECRET || "local-e2e-secret";

function normalizeAppUrl(url: string) {
    const nextUrl = new URL(url);
    const targetBaseUrl = new URL(baseURL);
    nextUrl.protocol = targetBaseUrl.protocol;
    nextUrl.hostname = targetBaseUrl.hostname;
    nextUrl.port = targetBaseUrl.port;
    return nextUrl.toString();
}

async function callE2E(pathname = "", init?: RequestInit) {
    const response = await fetch(`${baseURL}/api/test/e2e${pathname}`, {
        ...init,
        headers: {
            "content-type": "application/json",
            "x-e2e-test-secret": e2eSecret,
            ...(init?.headers || {}),
        },
    });

    if (!response.ok) {
        throw new Error(`E2E control request failed (${response.status})`);
    }

    return response.json() as Promise<Record<string, unknown>>;
}

async function createPageWithStorageState(browser: any, storageState: string): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    return { context, page };
}

export async function waitForAppShell(page: Page, path: string, heading: RegExp | string) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

export async function expectResendBanner(page: Page, visible: boolean) {
    const alert = page.getByTestId("resend-status-alert");
    if (visible) {
        await expect(alert).toBeVisible();
    } else {
        await expect(alert).toHaveCount(0);
    }
}

export async function openUserActionsForEmail(page: Page, email: string) {
    const row = page.locator(`[data-user-email="${email}"]`);
    await expect(row).toBeVisible();
    await row.hover();
    await row.locator('[data-testid^="user-actions-"]').click();
}

export async function selectShadcnOption(page: Page, label: string, option: string) {
    const target = page.locator("div.space-y-2").filter({ has: page.getByText(label, { exact: false }) }).first();
    await target.getByRole("combobox").click();
    await page.getByRole("option", { name: option, exact: true }).click();
}

export async function completeInviteSignup(browser: any, inviteUrl: string, email: string, runId: string) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(normalizeAppUrl(inviteUrl));
    await expect(page.getByRole("button", { name: /complete sign up/i })).toBeVisible();
    await page.getByPlaceholder("John Doe").fill(`E2E ${runId} User`);
    await expect(page.getByPlaceholder("name@example.com")).toHaveValue(email);
    await page.locator('input[type="password"]').fill("Password123!");
    await page.getByRole("button", { name: /complete sign up/i }).click();
    await expect(page).not.toHaveURL(/\/signup/);
    await context.close();
}

export const test = base.extend<Fixtures>({
    e2e: async ({}, use) => {
        await use({
            async cleanup(runId: string) {
                await callE2E("", {
                    method: "POST",
                    body: JSON.stringify({ action: "cleanup-run", runId }),
                });
            },
            async clearEmails() {
                await callE2E("", {
                    method: "POST",
                    body: JSON.stringify({ action: "clear-emails" }),
                });
            },
            async getEmails(runId?: string) {
                const result = await callE2E(runId ? `?runId=${encodeURIComponent(runId)}` : "");
                return (Array.isArray(result.emails) ? result.emails : []) as any[];
            },
            async resetState() {
                await callE2E("", {
                    method: "POST",
                    body: JSON.stringify({ action: "reset-state" }),
                });
            },
            async setMode(mode) {
                await callE2E("", {
                    method: "POST",
                    body: JSON.stringify({ action: "set-mode", mode }),
                });
            },
        });
    },
    runId: async ({ e2e }, use, testInfo) => {
        const runId = `${testInfo.workerIndex}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        await use(runId);
        await e2e.cleanup(runId);
        await e2e.clearEmails();
    },
    managerPage: async ({ browser }, use) => {
        const { context, page } = await createPageWithStorageState(browser, managerStorageStatePath);
        await use(page);
        await context.close();
    },
    superAdminPage: async ({ browser }, use) => {
        const { context, page } = await createPageWithStorageState(browser, superAdminStorageStatePath);
        await use(page);
        await context.close();
    },
});

export { expect };
