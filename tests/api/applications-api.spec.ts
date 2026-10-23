import { test, expect } from '../../fixtures/auth.fixture';
import { ApiClient } from '../../utils/apiClient';
import { extractList, findDeep, statusMatches } from '../../utils/assertions';
import { users } from '../../fixtures/users';
import { startApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

type App = Record<string, unknown>;
const idOf = (a: App): string => String(findDeep(a, /^(id|applicationId)$/i));

test.describe('Applications API', () => {
  test(...tc('TC-API-06'), async ({ agent, api }) => {
    await startApplication(agent);
    await agent.dashboard.goto();
    const { status, body } = await api.getJson('/api/applications');
    expect(status).toBe(200);
    const apiApps = extractList<App>(body);

    const uiIds = await agent.dashboard.rowIds();
    expect(uiIds.length).toBeGreaterThan(0);
    for (const id of uiIds) {
      const row = apiApps.find((a) => idOf(a) === id);
      expect(row, `application ${id} present in API`).toBeTruthy();
      const apiStatus = String(findDeep(row, /^(status|currentStatus)$/i) ?? '');
      expect(statusMatches(await agent.dashboard.statusOf(id), apiStatus)).toBe(true);
    }
    // Count parity applies when the dashboard shows the complete list (no paging)
    if (uiIds.length === apiApps.length) expect(uiIds.length).toBe(apiApps.length);
  });

  test(...tc('TC-API-08'), async ({ api }) => {
    test.skip(!users.second.username, 'SECOND_AGENT_USER not configured');
    const mineId = await api.createApplication();
    const other = await ApiClient.create({ authenticated: true, credentials: users.second });
    try {
      const mine = extractList<App>((await api.getJson('/api/applications')).body).map(idOf);
      const theirs = extractList<App>((await other.getJson('/api/applications')).body).map(idOf);
      expect(mine).toContain(mineId);
      expect(theirs.filter((id) => mine.includes(id)), 'lists must not overlap').toEqual([]);

      const res = await other.get(`/api/applications/${mineId}`);
      expect([403, 404]).toContain(res.status());
    } finally {
      await other.dispose();
    }
  });
});
