import { test, expect } from '../../fixtures/auth.fixture';
import { requireApi } from '../../utils/apiCrossCheck';
import { findDeep, statusMatches } from '../../utils/assertions';
import { startApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Dashboard vs status API', () => {
  test(...tc('TC-DASH-06'), async ({ agent, api }) => {
    requireApi(api, 'dashboard status vs GET status');
    // Make sure there is at least one application owned by this agent
    await startApplication(agent);
    await agent.dashboard.goto();

    const ids = (await agent.dashboard.rowIds()).slice(0, 10);
    expect(ids.length, 'dashboard should list at least one application').toBeGreaterThan(0);

    for (const id of ids) {
      const uiStatus = await agent.dashboard.statusOf(id);
      const { status, body } = await api.getJson(`/api/applications/${id}/status`);
      expect(status, `GET /api/applications/${id}/status`).toBe(200);
      const apiStatus = String(findDeep(body, /^(status|currentStatus|current_status)$/i) ?? '');
      expect(statusMatches(uiStatus, apiStatus), `application ${id}: UI "${uiStatus}" vs API "${apiStatus}"`).toBe(true);
    }
  });
});
