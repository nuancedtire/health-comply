#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PW_SESSION="${PW_SESSION:-resend-ux-smoke}"
EXPECT_RESEND_CONFIGURED="${EXPECT_RESEND_CONFIGURED:-false}"
TEAM_EMAIL="${TEAM_EMAIL:-}"
TEAM_PASSWORD="${TEAM_PASSWORD:-}"
SUPERADMIN_EMAIL="${SUPERADMIN_EMAIL:-}"
SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:-}"
INVITE_EMAIL="${INVITE_EMAIL:-resend-smoke+invite@example.com}"
RESET_EMAIL="${RESET_EMAIL:-resend-smoke+reset@example.com}"

if ! command -v playwright-cli >/dev/null 2>&1; then
  echo "playwright-cli is not installed or not on PATH." >&2
  exit 1
fi

if [[ -z "$TEAM_EMAIL" || -z "$TEAM_PASSWORD" ]]; then
  cat >&2 <<'EOF'
TEAM_EMAIL and TEAM_PASSWORD are required.

Example:
  BASE_URL=http://127.0.0.1:3000 \
  TEAM_EMAIL=admin@riverside.test \
  TEAM_PASSWORD=password \
  ./scripts/test_resend_ux.sh
EOF
  exit 1
fi

run_pw() {
  playwright-cli -s="$PW_SESSION" "$@"
}

run_code() {
  local code="$1"
  run_pw run-code "$code"
}

extract_result() {
  local output="$1"
  local result
  result="$(printf '%s\n' "$output" | awk '
    /^### Result$/ { capture=1; next }
    /^### / && capture { exit }
    capture { print }
  ')"

  if [[ -z "$result" ]]; then
    printf '%s' "$output"
    return
  fi

  result="$(printf '%s' "$result" | sed -e '1s/^"//' -e '$s/"$//' -e 's/\\"/"/g')"
  printf '%s' "$result"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local context="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "Assertion failed: expected '$needle' in $context" >&2
    echo "Actual output:" >&2
    printf '%s\n' "$haystack" >&2
    exit 1
  fi
}

log() {
  printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$1"
}

cleanup() {
  run_pw close >/dev/null 2>&1 || true
}

trap cleanup EXIT

log "Checking app availability at $BASE_URL"
if ! curl -fsS "$BASE_URL/login" >/dev/null 2>&1; then
  cat >&2 <<EOF
The app is not reachable at:
  $BASE_URL

Start the app first, for example:
  pnpm dev

Then re-run:
  BASE_URL=$BASE_URL \\
  TEAM_EMAIL=$TEAM_EMAIL \\
  TEAM_PASSWORD='***' \\
  EXPECT_RESEND_CONFIGURED=$EXPECT_RESEND_CONFIGURED \\
  ./scripts/test_resend_ux.sh
EOF
  exit 1
fi

log "Opening browser session"
run_pw open "$BASE_URL" >/dev/null

log "Logging in as team-scoped/admin user"
login_output="$(run_code "(async (page) => {
  await page.goto('${BASE_URL}/login', { waitUntil: 'networkidle' });
  await page.locator('input[type=\"email\"]').fill('${TEAM_EMAIL}');
  await page.locator('input[type=\"password\"]').fill('${TEAM_PASSWORD}');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  return await page.url();
})")" || {
  echo "Login failed for TEAM_EMAIL=$TEAM_EMAIL" >&2
  printf '%s\n' "$login_output" >&2
  exit 1
}
login_output="$(extract_result "$login_output")"

log "Checking forgot-password banner state"
forgot_output="$(run_code "(async (page) => {
  await page.goto('${BASE_URL}/forgot-password', { waitUntil: 'networkidle' });
  const banner = page.getByRole('alert').first();
  return JSON.stringify({
    url: page.url(),
    hasBanner: await banner.count() > 0,
    body: await page.locator('body').innerText()
  });
})")" || {
  echo "Failed to load forgot-password page." >&2
  printf '%s\n' "$forgot_output" >&2
  exit 1
}
forgot_output="$(extract_result "$forgot_output")"
if [[ "$EXPECT_RESEND_CONFIGURED" == "true" ]]; then
  assert_contains "$forgot_output" '"hasBanner":false' "forgot-password output"
else
  assert_contains "$forgot_output" '"hasBanner":true' "forgot-password output"
  assert_contains "$forgot_output" 'password reset emails cannot be sent right now' "forgot-password warning"
fi

log "Checking team page banner state"
team_page_output="$(run_code "(async (page) => {
  await page.goto('${BASE_URL}/team', { waitUntil: 'networkidle' });
  const banner = page.getByRole('alert').first();
  return JSON.stringify({
    url: page.url(),
    hasBanner: await banner.count() > 0,
    body: await page.locator('body').innerText()
  });
})")" || {
  echo "Failed to load team page." >&2
  printf '%s\n' "$team_page_output" >&2
  exit 1
}
team_page_output="$(extract_result "$team_page_output")"
if [[ "$EXPECT_RESEND_CONFIGURED" == "true" ]]; then
  assert_contains "$team_page_output" '"hasBanner":false' "team page output"
else
  assert_contains "$team_page_output" '"hasBanner":true' "team page output"
  assert_contains "$team_page_output" 'Invites and admin-triggered password resets will need to be shared manually' "team warning"
fi

log "Creating invite from team page"
invite_output="$(run_code "(async (page) => {
  await page.goto('${BASE_URL}/team', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /invite user/i }).click();
  await page.locator('input#email').fill('${INVITE_EMAIL}');
  const roleTrigger = page.locator('button[role=\"combobox\"]').filter({ hasText: /role|select a role/i }).first();
  await roleTrigger.click();
  await page.getByRole('option', { name: 'Admin' }).click();
  await page.getByRole('button', { name: /send invitation|create invitation/i }).click();
  await page.waitForTimeout(1000);
  const body = await page.locator('body').innerText();
  const manualDialog = page.getByRole('dialog').filter({ hasText: /share invitation link/i });
  return JSON.stringify({
    manualDialogVisible: await manualDialog.count() > 0,
    body
  });
})")" || {
  echo "Team invite flow failed." >&2
  printf '%s\n' "$invite_output" >&2
  exit 1
}
invite_output="$(extract_result "$invite_output")"
if [[ "$EXPECT_RESEND_CONFIGURED" == "true" ]]; then
  assert_contains "$invite_output" '"manualDialogVisible":false' "team invite output"
  assert_contains "$invite_output" 'Invitation emailed' "team invite toast"
else
  assert_contains "$invite_output" '"manualDialogVisible":true' "team invite output"
  assert_contains "$invite_output" 'Invitation created without automatic email delivery.' "team invite fallback toast"
fi

log "Triggering reset-password flow from team page"
team_reset_output="$(run_code "(async (page) => {
  await page.goto('${BASE_URL}/team', { waitUntil: 'networkidle' });
  const row = page.locator('tr').filter({ hasText: '${TEAM_EMAIL}' }).first();
  await row.locator('button').last().click();
  await page.getByRole('menuitem', { name: /reset password/i }).click();
  const confirmDialog = page.getByRole('dialog').filter({ hasText: /reset password/i }).last();
  const confirmText = await confirmDialog.innerText();
  await confirmDialog.getByRole('button', { name: /send reset email|generate link|preparing/i }).click();
  await page.waitForTimeout(1000);
  const manualDialog = page.getByRole('dialog').filter({ hasText: /share password reset link/i });
  return JSON.stringify({
    confirmText,
    manualDialogVisible: await manualDialog.count() > 0,
    body: await page.locator('body').innerText()
  });
})")" || {
  echo "Team reset-password flow failed." >&2
  printf '%s\n' "$team_reset_output" >&2
  exit 1
}
team_reset_output="$(extract_result "$team_reset_output")"
if [[ "$EXPECT_RESEND_CONFIGURED" == "true" ]]; then
  assert_contains "$team_reset_output" 'Email a password reset link' "team reset confirmation"
  assert_contains "$team_reset_output" '"manualDialogVisible":false' "team reset output"
  assert_contains "$team_reset_output" 'Password reset email sent' "team reset toast"
else
  assert_contains "$team_reset_output" 'Generate a password reset link' "team reset confirmation"
  assert_contains "$team_reset_output" '"manualDialogVisible":true' "team reset output"
fi

log "Submitting forgot-password flow"
forgot_submit_output="$(run_code "(async (page) => {
  await page.goto('${BASE_URL}/forgot-password', { waitUntil: 'networkidle' });
  await page.locator('input').fill('${RESET_EMAIL}');
  await page.getByRole('button', { name: /send reset link/i }).click();
  await page.waitForTimeout(1000);
  return await page.locator('body').innerText();
})")" || {
  echo "Forgot-password submit flow failed." >&2
  printf '%s\n' "$forgot_submit_output" >&2
  exit 1
}
forgot_submit_output="$(extract_result "$forgot_submit_output")"
if [[ "$EXPECT_RESEND_CONFIGURED" == "true" ]]; then
  assert_contains "$forgot_submit_output" 'reset email is on the way' "forgot-password submit output"
else
  assert_contains "$forgot_submit_output" 'Password reset email is unavailable in this environment.' "forgot-password submit output"
fi

if [[ -n "$SUPERADMIN_EMAIL" && -n "$SUPERADMIN_PASSWORD" ]]; then
  log "Logging in as super admin"
  super_login_output="$(run_code "(async (page) => {
    await page.goto('${BASE_URL}/login', { waitUntil: 'networkidle' });
    await page.locator('input[type=\"email\"]').fill('${SUPERADMIN_EMAIL}');
    await page.locator('input[type=\"password\"]').fill('${SUPERADMIN_PASSWORD}');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForLoadState('networkidle');
    return await page.url();
  })")" || {
    echo "Login failed for SUPERADMIN_EMAIL=$SUPERADMIN_EMAIL" >&2
    printf '%s\n' "$super_login_output" >&2
    exit 1
  }
  super_login_output="$(extract_result "$super_login_output")"

  log "Checking super-admin users page banner state"
  super_users_output="$(run_code "(async (page) => {
    await page.goto('${BASE_URL}/admin/users', { waitUntil: 'networkidle' });
    const banner = page.getByRole('alert').first();
    return JSON.stringify({
      url: page.url(),
      hasBanner: await banner.count() > 0,
      body: await page.locator('body').innerText()
    });
  })")" || {
    echo "Failed to load super-admin users page." >&2
    printf '%s\n' "$super_users_output" >&2
    exit 1
  }
  super_users_output="$(extract_result "$super_users_output")"
  if [[ "$EXPECT_RESEND_CONFIGURED" == "true" ]]; then
    assert_contains "$super_users_output" '"hasBanner":false' "super admin users output"
  else
    assert_contains "$super_users_output" '"hasBanner":true' "super admin users output"
  fi

  log "Checking super-admin tenants page banner state"
  super_tenants_output="$(run_code "(async (page) => {
    await page.goto('${BASE_URL}/admin/tenants', { waitUntil: 'networkidle' });
    const banner = page.getByRole('alert').first();
    return JSON.stringify({
      url: page.url(),
      hasBanner: await banner.count() > 0,
      body: await page.locator('body').innerText()
    });
  })")" || {
    echo "Failed to load super-admin tenants page." >&2
    printf '%s\n' "$super_tenants_output" >&2
    exit 1
  }
  super_tenants_output="$(extract_result "$super_tenants_output")"
  if [[ "$EXPECT_RESEND_CONFIGURED" == "true" ]]; then
    assert_contains "$super_tenants_output" '"hasBanner":false' "super admin tenants output"
  else
    assert_contains "$super_tenants_output" '"hasBanner":true' "super admin tenants output"
  fi
fi

log "Resend UX smoke test completed"
