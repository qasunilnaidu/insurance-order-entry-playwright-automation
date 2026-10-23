import { test, expect } from '../../fixtures/auth.fixture';
import { buildClient } from '../../fixtures/applicationData';
import { isConfigured, users } from '../../fixtures/users';
import { ApiClient } from '../../utils/apiClient';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { uniqueAlpha } from '../../utils/dataGenerator';
import { completeClient, startApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Cross-agent isolation (risk QR-02)', () => {
  test(...tc('TC-DASH-08'), async ({ agent, freshContext }) => {
    test.skip(!isConfigured(users.second), 'SECOND_AGENT_USER / SECOND_AGENT_PASS not configured');

    // Agent A owns an application that contains a recognisable value
    const secret = uniqueAlpha(10);
    const id = await startApplication(agent);
    await completeClient(agent, id, buildClient({ lastName: secret }));

    // Agent B tries to open A's application by URL
    const other = await freshContext();
    await other.pages.signIn(users.second);

    for (const route of [`/applications/${id}`, `/applications/${id}/review`, `/applications/${id}/status`]) {
      const response = await other.pages.page.goto(route);
      const url = other.pages.page.url();
      const blockedByStatus = !!response && [401, 403, 404].includes(response.status());
      const redirectedAway = !url.includes(`/applications/${id}`);
      const deniedMessage = await other.pages.page.getByText(/denied|forbidden|not found|not authori[sz]ed|no access/i).first().isVisible().catch(() => false);
      expect(blockedByStatus || redirectedAway || deniedMessage, `${route} must be denied for another agent`).toBe(true);
      expect(await other.pages.dashboard.bodyText(), `no data of agent A may be rendered on ${route}`).not.toContain(secret);
    }

    // Backend cross-check: GET /api/applications/{otherId} returns 403/404
    // (guarded: without an API every /api/* route 404s, which would pass this check vacuously)
    const apiB = await ApiClient.create({ authenticated: true, credentials: users.second });
    await apiCrossCheck(apiB, 'GET another agent\'s application', async () => {
      const res = await apiB.get(`/api/applications/${id}`);
      expect([403, 404]).toContain(res.status());
    });
    await apiB.dispose();
  });
});
