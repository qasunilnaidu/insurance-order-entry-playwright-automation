import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { findDeep, statusMatches } from '../../utils/assertions';
import { submitCompleteApplication } from '../../utils/testHelpers';
import { appGap, tc } from '../../utils/testCase';

test.describe('Application status', () => {
  test(...tc('TC-WF-07'), async ({ agent, api }) => {
    const app = await submitCompleteApplication(agent);
    await agent.status.goto(app.id);
    const ui = await agent.status.readStatus();
    expect(statusMatches(ui, 'Submitted'), `status page shows "${ui}"`).toBe(true);
    await apiCrossCheck(api, 'GET status', async () => {
      const { status, body } = await api.getJson(`/api/applications/${app.id}/status`);
      expect(status).toBe(200);
      expect(statusMatches(ui, String(findDeep(body, /^(status|currentStatus)$/i)))).toBe(true);
    });
  });

  test(...tc('TC-WF-09'), async ({ agent }) => {
    appGap('status history records only the SUBMITTED entry, no Draft entry');
    const app = await submitCompleteApplication(agent);
    await agent.status.goto(app.id);
    await agent.status.expectHistoryHasEntries();
    const entries = await agent.status.historyEntries();
    const draftAt = entries.findIndex((e) => /draft/i.test(e));
    const submittedAt = entries.findIndex((e) => /submitted/i.test(e));
    expect(draftAt, 'Draft entry').toBeGreaterThanOrEqual(0);
    expect(submittedAt, 'Submitted entry').toBeGreaterThanOrEqual(0);
    // Order depends on sort direction; both must carry a timestamp
    for (const e of [entries[draftAt], entries[submittedAt]]) expect(e).toMatch(/\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{1,2}:\d{2}/);
  });
});
