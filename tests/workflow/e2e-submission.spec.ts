import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { findDeep, statusMatches } from '../../utils/assertions';
import { submitCompleteApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('End-to-end submission', () => {
  test(...tc('TC-WF-03'), async ({ agent, api }) => {
    const app = await submitCompleteApplication(agent);
    expect(app.reference).toBeTruthy();
    await agent.confirmation.expectNoErrors();

    await apiCrossCheck(api, 'GET status', async () => {
      const { body } = await api.getJson(`/api/applications/${app.id}/status`);
      expect(statusMatches('Submitted', String(findDeep(body, /^(status|currentStatus)$/i)))).toBe(true);
    });
  });

  test(...tc('TC-WF-08'), async ({ agent }) => {
    const a = await submitCompleteApplication(agent);
    const b = await submitCompleteApplication(agent);
    expect(a.reference).toBeTruthy();
    expect(b.reference).toBeTruthy();
    expect(a.reference).not.toBe(b.reference);
  });
});
