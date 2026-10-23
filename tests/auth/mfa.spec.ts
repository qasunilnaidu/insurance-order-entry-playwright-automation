import { test } from '../../fixtures/auth.fixture';
import { env } from '../../utils/env';
import { isConfigured, users } from '../../fixtures/users';
import { tc } from '../../utils/testCase';

test.describe('Authentication - MFA / OTP', () => {
  test(...tc('TC-AUTH-09'), async ({ pages }) => {
    test.skip(!isConfigured(users.mfa) || !env.mfaOtp, 'MFA_AGENT_* and MFA_OTP not configured (Open Item #2)');

    await pages.loginAs(users.mfa);

    // Wrong OTP is rejected
    const wrongOtp = env.mfaOtp === '000000' ? '111111' : '000000';
    await pages.login.enterOtp(wrongOtp);
    await pages.login.expectError(/otp|code|invalid|incorrect|wrong/i);

    // Correct OTP reaches the dashboard
    await pages.login.enterOtp(env.mfaOtp);
    await pages.login.expectDashboard();
  });
});
