import fs from "node:fs/promises";
import { test as setup, expect } from "@playwright/test";
import { managerStorageStatePath, superAdminStorageStatePath } from "./fixtures";

const managerEmail = process.env.E2E_MANAGER_EMAIL || "manager@healthcore.com";
const managerPassword = process.env.E2E_MANAGER_PASSWORD || "Password123!";
const superAdminEmail = process.env.E2E_SUPERADMIN_EMAIL || "admin@aiigent.io";
const superAdminPassword = process.env.E2E_SUPERADMIN_PASSWORD || "Password123!";

async function loginAndSave(page: any, email: string, password: string, storageStatePath: string) {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
    await page.waitForTimeout(500);
    await page.getByPlaceholder("name@example.com").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await page.context().storageState({ path: storageStatePath });
}

setup("authenticate saved sessions", async ({ browser }) => {
    await fs.mkdir(new URL("./.auth/", import.meta.url), { recursive: true });

    const managerContext = await browser.newContext();
    const managerPage = await managerContext.newPage();
    await loginAndSave(managerPage, managerEmail, managerPassword, managerStorageStatePath);
    await managerContext.close();

    const superAdminContext = await browser.newContext();
    const superAdminPage = await superAdminContext.newPage();
    await loginAndSave(superAdminPage, superAdminEmail, superAdminPassword, superAdminStorageStatePath);
    await superAdminContext.close();
});
