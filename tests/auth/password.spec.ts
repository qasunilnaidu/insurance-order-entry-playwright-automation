import { test, expect } from '../../fixtures/auth.fixture';
import { isConfigured, STRONG_PASSWORD, users, WEAK_PASSWORDS } from '../../fixtures/users';
import { env } from '../../utils/env';
import { seededDefect, tc } from '../../utils/testCase';

const SKIP_REASON = 'RESET_AGENT_USER / RESET_AGENT_PASS (disposable agent) not configured';

test.describe('Authentication - password reset and policy', () => {
  test(...tc('TC-AUTH-08'), async ({ pages }) => {
    test.skip(!isConfigured(users.reset), SKIP_REASON);

    for (const weak of WEAK_PASSWORDS) {
      await pages.forgot.resetPassword(users.reset.username, env.resetOtp, weak);
      await pages.forgot.expectPolicyRejection();
    }

    // The password was not changed: the old password still works
    await pages.loginAs(users.reset);
    await pages.login.expectDashboard();
  });

  test.describe('reset that changes the password', () => {
    // The disposable agent's password is restored after each test
    test.afterEach(async ({ pages }) => {
      if (!isConfigured(users.reset)) return;
      try {
        await pages.forgot.resetPassword(users.reset.username, env.resetOtp, users.reset.password);
      } catch {
        /* best effort: restore manually if the reset flow is unavailable */
      }
    });

    test(...tc('TC-AUTH-10'), async ({ pages, freshContext }) => {
      test.skip(!isConfigured(users.reset), SKIP_REASON);

      await pages.forgot.resetPassword(users.reset.username, env.resetOtp, STRONG_PASSWORD);

      // Login with the new password succeeds
      await pages.loginAs({ username: users.reset.username, password: STRONG_PASSWORD });
      await pages.login.expectDashboard();

      // The old password no longer works (separate browser context = no shared session)
      const other = await freshContext();
      await other.pages.loginAs(users.reset);
      await other.pages.login.expectOnLoginPage();
      await other.pages.login.expectError(/invalid|incorrect|wrong|failed|credentials/i);
    });

    test(...tc('TC-AUTH-11'), async ({ pages }) => {
      seededDefect('DEF-AUTH-006');
      test.skip(!isConfigured(users.reset), SKIP_REASON);

      await pages.forgot.resetPassword(users.reset.username, env.resetOtp, users.reset.password);
      await pages.forgot.expectError(/same|reuse|re-use|previous|different|cannot|already/i);

      // Password unchanged
      await pages.loginAs(users.reset);
      await expect(pages.page).toHaveURL(/\/dashboard/);
    });
  });
});
