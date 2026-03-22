# E2E Test Harness

This suite runs real Playwright end-to-end tests against local dev on `http://localhost:3000`.

## Commands

```bash
pnpm test:e2e
pnpm test:e2e:ui
```

## Default Accounts

- Practice manager: `manager@healthcore.com / Password123!`
- Super admin: `admin@aiigent.io / Password123!`

Override them with:

- `E2E_MANAGER_EMAIL`
- `E2E_MANAGER_PASSWORD`
- `E2E_SUPERADMIN_EMAIL`
- `E2E_SUPERADMIN_PASSWORD`

## Test Control Plane

The suite starts local dev with test-only env flags:

- `E2E_TEST_MODE=true`
- `E2E_TEST_SECRET=<secret>`
- `E2E_RESEND_MODE=missing|configured|failing`

When `E2E_TEST_MODE` is enabled, the app exposes `/api/test/e2e` for Playwright only. That route can:

- switch Resend behavior without restarting the server
- return captured outbound invite/reset payloads
- delete artifacts created for a given run ID

The route is guarded by `x-e2e-test-secret` and is unavailable outside test mode.

## Cleanup Rules

Each test generates a unique run ID and uses it in all created emails and tenant names:

- emails: `e2e+<runId>+<label>@example.test`
- tenants: `E2E <runId> Tenant`

After every test, cleanup removes:

- invitations for the run ID
- users and auth rows for the run ID
- verification rows for the run ID
- tenants and their dependent records for the run ID

This cleanup is idempotent and avoids touching seeded baseline data.
