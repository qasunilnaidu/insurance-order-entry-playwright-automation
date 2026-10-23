import { test, expect } from '../../fixtures/auth.fixture';
import { isConfigured, users, WRONG_PASSWORD } from '../../fixtures/users';
import { ApiClient } from '../../utils/apiClient';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { appGap, tc } from '../../utils/testCase';

const INVALID_CREDENTIALS = /invalid|incorrect|wrong|failed|credentials|not (found|recognized)/i;

test.describe('Authentication - login', () => {
  test(...tc('TC-AUTH-01'), async ({ pages }) => {
    appGap('no greeting / agent name is shown after login');
    await pages.loginAs(users.valid);
    await pages.login.expectDashboard();
    await expect(pages.login.greeting).toBeVisible();
    await pages.login.expectNoErrors();

    // Backend cross-check: POST /api/auth/login returns 200 + token/session
    const api = await ApiClient.create({ authenticated: true });
    await apiCrossCheck(api, 'POST /api/auth/login', async () => {
      expect(api.loginStatus).toBe(200);
    });
    await api.dispose();
  });

  test(...tc('TC-AUTH-02'), async ({ pages }) => {
    // 1) existing username + wrong password (disposable probe agent - see users.probe)
    await pages.login.goto();
    await pages.login.login(users.probe.username, WRONG_PASSWORD);
    await pages.login.expectOnLoginPage();
    await pages.login.expectError(INVALID_CREDENTIALS);
    await expect(pages.login.errors.filter({ hasText: /locked/i })).toHaveCount(0);
    const wrongPasswordMessage = (await pages.login.errors.filter({ hasText: INVALID_CREDENTIALS }).first().innerText()).trim();

    // 2) unknown user - must give the SAME message (no user enumeration)
    await pages.login.goto();
    await pages.login.login(users.invalid.username, users.invalid.password);
    await pages.login.expectOnLoginPage();
    await pages.login.expectError(INVALID_CREDENTIALS);
    const unknownUserMessage = (await pages.login.errors.filter({ hasText: INVALID_CREDENTIALS }).first().innerText()).trim();
    expect(unknownUserMessage, 'unknown user and wrong password must show the same message').toBe(wrongPasswordMessage);

    // 3) no session was created
    await pages.dashboard.goto();
    await pages.login.expectOnLoginPage();
  });

  test(...tc('TC-AUTH-03'), async ({ pages }) => {
    await pages.login.goto();
    await pages.login.submitEmpty();
    await pages.login.expectOnLoginPage();
    await pages.login.expectBothFieldsRequired();
  });

  test(...tc('TC-AUTH-13'), async ({ pages }) => {
    test.skip(!isConfigured(users.pending), 'PENDING_AGENT_USER / PENDING_AGENT_PASS not configured (Open Item #16)');
    await pages.loginAs(users.pending);
    await pages.login.expectOnLoginPage();
    await pages.login.expectError(/pending|approval|approved|awaiting|not (yet )?active/i);
    await pages.dashboard.goto();
    await pages.login.expectOnLoginPage();
  });

  // Cross-browser smoke (risk QR-13): also run with --project=firefox / --project=webkit
  test(...tc('TC-XC-01'), async ({ pages }) => {
    await pages.signIn(users.valid);
    await pages.dashboard.expectLoaded();
  });
});
