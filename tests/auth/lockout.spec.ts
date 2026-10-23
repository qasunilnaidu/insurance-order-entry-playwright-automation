import { test, expect } from '../../fixtures/auth.fixture';
import { isConfigured, users, WRONG_PASSWORD } from '../../fixtures/users';
import { seededDefect, tc } from '../../utils/testCase';

// Lock state persists in the application: run this file serially (npm run test:lockout uses workers=1).
test.describe.configure({ mode: 'serial' });

const INVALID_CREDENTIALS = /invalid|incorrect|wrong|failed|credentials/i;

test.describe('Authentication - account lockout', () => {
  test(...tc('TC-AUTH-06'), async ({ pages }) => {
    seededDefect('DEF-AUTH-001');
    test.skip(!isConfigured(users.locked), 'LOCKED_AGENT_USER / LOCKED_AGENT_PASS not configured');

    // Precondition: the seeded lock expires after 30 min (the app then auto-unlocks the account),
    // so (re)lock the dedicated locked agent with 5 failed attempts. Harmless if already locked.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await pages.login.goto();
      await pages.login.login(users.locked.username, WRONG_PASSWORD);
      await pages.login.expectOnLoginPage();
    }

    await pages.loginAs(users.locked);
    await pages.login.expectOnLoginPage();
    await pages.login.expectError(/locked/i);

    // No session was created
    await pages.dashboard.goto();
    await pages.login.expectOnLoginPage();
  });

  test(...tc('TC-AUTH-07'), async ({ pages }) => {
    // Uses the RESERVED lockout agent: after this test an admin must unlock the account.
    test.skip(!isConfigured(users.lockout), 'LOCKOUT_TEST_AGENT_USER / LOCKOUT_TEST_AGENT_PASS not configured');

    // Attempts 1-4: normal "invalid credentials" message, NOT locked
    for (let attempt = 1; attempt <= 4; attempt++) {
      await pages.loginAs({ username: users.lockout.username, password: `${WRONG_PASSWORD}${attempt}` });
      await pages.login.expectOnLoginPage();
      await pages.login.expectError(INVALID_CREDENTIALS);
      await expect(pages.login.errors.filter({ hasText: /locked/i }), `account must not be locked after attempt ${attempt}`).toHaveCount(0);
    }

    // Attempt 5: the account becomes locked
    await pages.loginAs({ username: users.lockout.username, password: `${WRONG_PASSWORD}5` });
    await pages.login.expectOnLoginPage();

    // The CORRECT password is now rejected with the locked message
    await pages.loginAs(users.lockout);
    await pages.login.expectOnLoginPage();
    await pages.login.expectError(/locked/i);
  });
});
