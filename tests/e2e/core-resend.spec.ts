import { test, expect, completeInviteSignup, expectResendBanner, openUserActionsForEmail, waitForAppShell } from "./fixtures";

function buildTestEmail(runId: string, label: string) {
    return `e2e+${runId}+${label}@example.test`;
}

function buildTenantName(runId: string) {
    return `E2E ${runId} Tenant`;
}

async function getLatestEmail(e2e: any, runId: string, kind: "invitation" | "password-reset", recipient?: string) {
    const emails = await e2e.getEmails(runId);
    const match = [...emails].reverse().find((email) => email.kind === kind && (!recipient || email.to === recipient));
    expect(match).toBeTruthy();
    return match;
}

async function inviteTeamUser(page: any, email: string) {
    await waitForAppShell(page, "/team", /team members/i);
    await page.getByTestId("invite-user-trigger").click();
    await expect(page.getByTestId("invite-user-dialog")).toBeVisible();
    await page.getByLabel("Email Address").fill(email);

    const dialog = page.getByTestId("invite-user-dialog");
    await dialog.locator("div.space-y-2").filter({ has: page.getByText("Role", { exact: false }) }).getByRole("combobox").click();
    await page.getByRole("option", { name: "GP Partner", exact: true }).click();

    await dialog.locator("div.space-y-2").filter({ has: page.getByText("Site", { exact: false }) }).getByRole("combobox").click();
    await page.getByRole("option").filter({ hasNotText: "None (Tenant Level)" }).first().click();

    await dialog.getByRole("button", { name: /send invitation|create invitation/i }).click();
}

async function revokePendingInvite(page: any, email: string) {
    await openUserActionsForEmail(page, email);
    await page.getByRole("menuitem", { name: /revoke invitation/i }).click();
    await page.getByRole("button", { name: /^revoke invitation$/i }).click();
    await expect(page.locator(`[data-user-email="${email}"]`)).toHaveCount(0);
}

async function triggerPasswordReset(page: any, email: string) {
    await page.reload();
    await openUserActionsForEmail(page, email);
    await page.getByRole("menuitem", { name: /reset password/i }).click();
    await expect(page.getByTestId("reset-password-dialog")).toBeVisible();
    await page.getByTestId("reset-password-dialog").getByRole("button", { name: /send reset email|generate link/i }).click();
}

async function createTenant(page: any, tenantName: string) {
    await waitForAppShell(page, "/admin/tenants", /organization management/i);
    await page.getByLabel("Organization Name").fill(tenantName);
    await page.getByRole("button", { name: /create organization/i }).click();
    await expect(page.locator(`[data-tenant-name="${tenantName}"]`)).toBeVisible();
}

async function inviteTenantManager(page: any, tenantName: string, email: string) {
    const row = page.locator(`[data-tenant-name="${tenantName}"]`);
    await row.getByRole("button", { name: /invite manager|resend invite/i }).click();
    await expect(page.getByTestId("tenant-invite-dialog")).toBeVisible();
    await page.getByTestId("tenant-invite-dialog").getByLabel("Email Address").fill(email);
    await page.getByTestId("tenant-invite-dialog").getByRole("button", { name: /send invitation|create invitation/i }).click();
}

test.describe("core auth and resend journeys", () => {
    test("practice manager is blocked from super admin pages", async ({ e2e, managerPage }) => {
        await e2e.resetState();
        await e2e.setMode("configured");
        await managerPage.goto("/admin/users");
        await expect(managerPage).not.toHaveURL(/\/admin\/users/);
        await expect(managerPage.getByRole("heading", { name: /compliance dashboard/i })).toBeVisible();
    });

    test("missing resend mode uses visible banners and manual fallback UX", async ({ browser, e2e, managerPage, runId, superAdminPage }) => {
        await e2e.resetState();
        await e2e.setMode("missing");

        const forgotPasswordContext = await browser.newContext();
        const forgotPasswordPage = await forgotPasswordContext.newPage();
        await forgotPasswordPage.goto("/forgot-password");
        await expectResendBanner(forgotPasswordPage, true);
        await forgotPasswordPage.getByPlaceholder("name@example.com").fill(buildTestEmail(runId, "forgot"));
        await forgotPasswordPage.getByRole("button", { name: /send reset link/i }).click();
        await expect(forgotPasswordPage.getByText(/password reset email is unavailable/i)).toBeVisible();
        await forgotPasswordContext.close();

        await waitForAppShell(managerPage, "/team", /team members/i);
        await expectResendBanner(managerPage, true);

        const pendingInviteEmail = buildTestEmail(runId, "pending");
        await inviteTeamUser(managerPage, pendingInviteEmail);
        await expect(managerPage.getByTestId("manual-invite-dialog")).toBeVisible();
        const pendingInviteUrl = await managerPage.getByTestId("manual-invite-dialog").locator("input[readonly]").inputValue();
        expect(pendingInviteUrl).toContain("/signup?token=");
        await managerPage.getByTestId("manual-invite-dialog").getByRole("button", { name: /done/i }).click();
        await revokePendingInvite(managerPage, pendingInviteEmail);

        const acceptedInviteEmail = buildTestEmail(runId, "member");
        await inviteTeamUser(managerPage, acceptedInviteEmail);
        await expect(managerPage.getByTestId("manual-invite-dialog")).toBeVisible();
        const inviteUrl = await managerPage.getByTestId("manual-invite-dialog").locator("input[readonly]").inputValue();
        await managerPage.getByTestId("manual-invite-dialog").getByRole("button", { name: /done/i }).click();
        await completeInviteSignup(browser, inviteUrl, acceptedInviteEmail, runId);

        await waitForAppShell(managerPage, "/team", /team members/i);
        await triggerPasswordReset(managerPage, acceptedInviteEmail);
        await expect(managerPage.getByTestId("manual-reset-dialog")).toBeVisible();
        await expect(managerPage.getByTestId("manual-reset-dialog").locator("input[readonly]")).toHaveValue(/\/reset-password\?token=/);

        await waitForAppShell(superAdminPage, "/admin/users", /user management/i);
        await expectResendBanner(superAdminPage, true);
        await waitForAppShell(superAdminPage, "/admin/tenants", /organization management/i);
        await expectResendBanner(superAdminPage, true);

        const tenantName = buildTenantName(runId);
        await createTenant(superAdminPage, tenantName);
        await inviteTenantManager(superAdminPage, tenantName, buildTestEmail(runId, "tenant-manager"));
        await expect(superAdminPage.getByTestId("manual-invite-dialog")).toBeVisible();
        await expect(superAdminPage.getByTestId("manual-invite-dialog").locator("input[readonly]")).toHaveValue(/\/signup\?token=/);
    });

    test("configured resend mode sends captured emails without manual dialogs", async ({ browser, e2e, managerPage, runId, superAdminPage }) => {
        await e2e.resetState();
        await e2e.setMode("configured");

        const forgotPasswordContext = await browser.newContext();
        const forgotPasswordPage = await forgotPasswordContext.newPage();
        await forgotPasswordPage.goto("/forgot-password");
        await expectResendBanner(forgotPasswordPage, false);
        await forgotPasswordPage.getByPlaceholder("name@example.com").fill(buildTestEmail(runId, "forgot"));
        await forgotPasswordPage.getByRole("button", { name: /send reset link/i }).click();
        await expect(forgotPasswordPage.getByText(/if that account exists, a reset email is on the way/i)).toBeVisible();
        await forgotPasswordContext.close();

        await waitForAppShell(managerPage, "/team", /team members/i);
        await expectResendBanner(managerPage, false);

        const acceptedInviteEmail = buildTestEmail(runId, "member");
        await inviteTeamUser(managerPage, acceptedInviteEmail);
        await expect(managerPage.getByTestId("manual-invite-dialog")).toHaveCount(0);
        const invitationEmail = await getLatestEmail(e2e, runId, "invitation", acceptedInviteEmail);
        expect(invitationEmail.status).toBe("sent");
        await completeInviteSignup(browser, invitationEmail.url, acceptedInviteEmail, runId);

        await waitForAppShell(managerPage, "/team", /team members/i);
        await triggerPasswordReset(managerPage, acceptedInviteEmail);
        await expect(managerPage.getByTestId("manual-reset-dialog")).toHaveCount(0);
        const resetEmail = await getLatestEmail(e2e, runId, "password-reset", acceptedInviteEmail);
        expect(resetEmail.status).toBe("sent");
        expect(resetEmail.url).toContain("/reset-password?token=");

        await waitForAppShell(superAdminPage, "/admin/users", /user management/i);
        await expectResendBanner(superAdminPage, false);
        await waitForAppShell(superAdminPage, "/admin/tenants", /organization management/i);
        await expectResendBanner(superAdminPage, false);

        const tenantName = buildTenantName(runId);
        const tenantInviteEmail = buildTestEmail(runId, "tenant-manager");
        await createTenant(superAdminPage, tenantName);
        await inviteTenantManager(superAdminPage, tenantName, tenantInviteEmail);
        await expect(superAdminPage.getByTestId("manual-invite-dialog")).toHaveCount(0);
        const tenantInvite = await getLatestEmail(e2e, runId, "invitation", tenantInviteEmail);
        expect(tenantInvite.status).toBe("sent");
        expect(tenantInvite.url).toContain("/signup?token=");
    });

    test("failing resend mode falls back to manual links and captures failed attempts", async ({ browser, e2e, managerPage, runId, superAdminPage }) => {
        await e2e.resetState();
        await e2e.setMode("failing");

        await waitForAppShell(managerPage, "/team", /team members/i);
        await expectResendBanner(managerPage, false);

        const acceptedInviteEmail = buildTestEmail(runId, "member");
        await inviteTeamUser(managerPage, acceptedInviteEmail);
        await expect(managerPage.getByTestId("manual-invite-dialog")).toBeVisible();
        const inviteUrl = await managerPage.getByTestId("manual-invite-dialog").locator("input[readonly]").inputValue();
        const failedInvite = await getLatestEmail(e2e, runId, "invitation", acceptedInviteEmail);
        expect(failedInvite.status).toBe("failed");
        await managerPage.getByTestId("manual-invite-dialog").getByRole("button", { name: /done/i }).click();
        await completeInviteSignup(browser, inviteUrl, acceptedInviteEmail, runId);

        await waitForAppShell(managerPage, "/team", /team members/i);
        await triggerPasswordReset(managerPage, acceptedInviteEmail);
        await expect(managerPage.getByTestId("manual-reset-dialog")).toBeVisible();
        const failedReset = await getLatestEmail(e2e, runId, "password-reset", acceptedInviteEmail);
        expect(failedReset.status).toBe("failed");

        await waitForAppShell(superAdminPage, "/admin/tenants", /organization management/i);
        await expectResendBanner(superAdminPage, false);
        const tenantName = buildTenantName(runId);
        const tenantInviteEmail = buildTestEmail(runId, "tenant-manager");
        await createTenant(superAdminPage, tenantName);
        await inviteTenantManager(superAdminPage, tenantName, tenantInviteEmail);
        await expect(superAdminPage.getByTestId("manual-invite-dialog")).toBeVisible();
        const tenantInvite = await getLatestEmail(e2e, runId, "invitation", tenantInviteEmail);
        expect(tenantInvite.status).toBe("failed");
    });
});
