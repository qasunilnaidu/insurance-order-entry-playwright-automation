import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { apiUrl, env } from '../../utils/env';
import { completeClient, startApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Authentication - session management', () => {
  test(...tc('TC-AUTH-04'), async ({ agent, page }) => {
    await agent.login.logout();
    await agent.login.expectOnLoginPage();

    // Browser Back must not bring the dashboard back
    await page.goBack();
    await agent.login.expectOnLoginPage();

    // Direct access is still blocked
    await agent.dashboard.goto();
    await agent.login.expectOnLoginPage();

    // Session cookie / token is cleared
    if (env.sessionCookieName) {
      const names = (await page.context().cookies()).map((c) => c.name);
      expect(names, 'session cookie must be removed on logout').not.toContain(env.sessionCookieName);
    }
    // Backend cross-check: GET /api/applications returns 401 after logout
    const res = await page.request.get(apiUrl('/api/applications'));
    expect([401, 403]).toContain(res.status());
  });

  test(...tc('TC-AUTH-05'), async ({ pages, page }) => {
    const applicationId = env.seededDraftId || '1';
    for (const route of ['/dashboard', '/applications/new', `/applications/${applicationId}/review`]) {
      await page.goto(route);
      await expect(page, `${route} must redirect to /login`).toHaveURL(/\/login/);
      await expect(pages.login.username).toBeVisible();
    }
  });

  test(...tc('TC-AUTH-12'), async ({ agent, page, api }) => {
    // 1) saved data + an unsaved edit on an application step
    const applicationId = await startApplication(agent);
    const saved = await completeClient(agent, applicationId);
    await agent.client.goto(applicationId);
    const unsavedEdit = 'UnsavedOccupationEdit';
    await agent.client.occupation.fill(unsavedEdit);

    // 2) expire the session (cookies and browser storage)
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* storage not accessible */
      }
    });

    // 3) saving / navigating forces re-login and exposes no data. Saving with the stale form token gets
    // Laravel's 419 "Page Expired" on the same URL, so reopen the step to see where the app sends us.
    await agent.client.nextStep();
    expect(await agent.login.bodyText()).not.toContain(saved.firstName);
    if (!/\/login/.test(page.url())) await agent.client.goto(applicationId);
    await agent.login.expectOnLoginPage();
    expect(await agent.login.bodyText()).not.toContain(saved.firstName);
    await apiCrossCheck(api, 'GET application without a session', async () => {
      const res = await page.request.get(apiUrl(`/api/applications/${applicationId}`));
      expect([401, 403]).toContain(res.status());
    });

    // 4) after re-login the saved data is intact and the unsaved edit was not stored
    await agent.loginAs({ username: env.validUser, password: env.validPass });
    await agent.login.expectDashboard();
    await agent.client.goto(applicationId);
    await expect(agent.client.firstName).toHaveValue(saved.firstName);
    await expect(agent.client.occupation).not.toHaveValue(unsavedEdit);
  });
});
