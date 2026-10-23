import { test, expect } from '../../fixtures/auth.fixture';
import { isConfigured, users } from '../../fixtures/users';
import { buildClient } from '../../fixtures/applicationData';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { uniqueAlpha } from '../../utils/dataGenerator';
import { completeClient, startApplication } from '../../utils/testHelpers';
import { appGap, tc } from '../../utils/testCase';

test.describe('Agent dashboard and application summary', () => {
  test(...tc('TC-DASH-01'), async ({ agent }) => {
    await agent.dashboard.expectLoaded();
  });

  test(...tc('TC-DASH-02'), async ({ agent, freshContext }) => {
    test.skip(!isConfigured(users.second), 'SECOND_AGENT_USER / SECOND_AGENT_PASS not configured');

    const agentA = await agent.dashboard.rowIds();

    const other = await freshContext();
    await other.pages.signIn(users.second);
    const agentB = await other.pages.dashboard.rowIds();

    const overlap = agentA.filter((id) => agentB.includes(id));
    expect(overlap, 'neither agent may see the other agent\'s applications').toEqual([]);
  });

  test(...tc('TC-DASH-03'), async ({ pages }) => {
    appGap('login auto-creates a draft for every agent, so the empty state cannot occur');
    test.skip(!isConfigured(users.newAgent), 'NEW_AGENT_USER / NEW_AGENT_PASS not configured');

    await pages.signIn(users.newAgent);
    await expect(pages.dashboard.emptyState).toBeVisible();
    await expect(pages.dashboard.newApplicationButton).toBeVisible();
    expect(await pages.dashboard.rowCount(), 'no rows for an agent without applications').toBe(0);
  });

  test(...tc('TC-DASH-04'), async ({ agent, api }) => {
    // Draft created in the test (independent of seed data)
    const id = await startApplication(agent);
    const saved = await completeClient(agent, id);

    // 1) open the draft from the dashboard
    await agent.dashboard.goto();
    await agent.dashboard.resumeDraft(id);
    await expect(agent.page).toHaveURL(new RegExp(`/applications/${id}`));

    // 2) saved values are present and unchanged
    await agent.client.goto(id);
    await expect(agent.client.firstName).toHaveValue(saved.firstName);
    await expect(agent.client.lastName).toHaveValue(saved.lastName);
    await expect(agent.client.dob).toHaveValue(saved.dob);

    // Backend cross-check: saved draft values
    await apiCrossCheck(api, 'GET client', async () => {
      const { status, body } = await api.getJson(`/api/applications/${id}/client`);
      expect(status).toBe(200);
      expect(JSON.stringify(body)).toContain(saved.firstName);
    });
  });

  test(...tc('TC-DASH-05'), async ({ agent }) => {
    for (const status of ['Draft', 'Submitted', 'Approved']) {
      await agent.dashboard.goto();
      await agent.dashboard.filterBy(status);
      if ((await agent.dashboard.rowCount()) === 0) {
        // Seed data should contain every status (counts must match the seed); record rather than fail silently
        test.info().annotations.push({ type: 'observed', description: `No ${status} rows shown - confirm the seed contains ${status} applications` });
        expect(status, 'Draft and Submitted applications must be seeded').toBe('Approved');
        continue;
      }
      await agent.dashboard.expectRowsAllHaveStatus(status);
    }
  });

  test(...tc('TC-DASH-07'), async ({ agent }) => {
    const lastName = uniqueAlpha(9);
    const id = await startApplication(agent);
    await completeClient(agent, id, buildClient({ lastName }));

    await agent.dashboard.goto();
    const initialCount = await agent.dashboard.rowCount();

    // 1) by client name
    await agent.dashboard.search(lastName);
    await expect(agent.dashboard.rowFor(id)).toBeVisible();
    for (const text of await agent.dashboard.rowTexts()) expect(text).toContain(lastName);

    // 2) by reference / id
    await agent.dashboard.search(id);
    await expect(agent.dashboard.rowFor(id)).toBeVisible();

    // 3) non-existent term
    await agent.dashboard.search(`zzz${uniqueAlpha(10)}`);
    await expect(agent.dashboard.emptyResult).toBeVisible();
    expect(await agent.dashboard.rowCount()).toBe(0);

    // 4) clearing restores the full list
    await agent.dashboard.clearSearch();
    await expect.poll(() => agent.dashboard.rowCount()).toBe(initialCount);
  });

  test(...tc('TC-DASH-09'), async ({ agent, freshContext }) => {
    const routes = ['/profile', '/support'];
    for (const route of routes) {
      await agent.page.goto(route);
      await expect(agent.page).toHaveURL(new RegExp(route));
      await expect(agent.page.getByRole('heading').first()).toBeVisible();
    }

    // Logged out (fresh context) -> redirected to /login
    const other = await freshContext();
    for (const route of routes) {
      await other.pages.page.goto(route);
      await expect(other.pages.page).toHaveURL(/\/login/);
    }
  });
});
