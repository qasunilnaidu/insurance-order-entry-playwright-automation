import { test, expect } from '../../fixtures/auth.fixture';
import { SYNTHETIC_SSN } from '../../fixtures/testData';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { submitCompleteApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-WF-13'), async ({ agent, api }) => {
  const app = await submitCompleteApplication(agent);

  // Read-only view equals the entered data
  await agent.status.gotoDetail(app.id);
  const text = await agent.status.bodyText();
  expect(text).toContain(app.client.firstName);
  expect(text).toContain(app.client.lastName);
  expect(text).not.toContain(SYNTHETIC_SSN);

  // API detail equals the entered data and exposes no unmasked ID
  await apiCrossCheck(api, 'GET application detail', async () => {
    const { status, body } = await api.getJson(`/api/applications/${app.id}`);
    expect(status).toBe(200);
    const json = JSON.stringify(body);
    expect(json).toContain(app.client.firstName);
    expect(json).toContain(app.client.lastName);
    expect(json).not.toContain(SYNTHETIC_SSN);
  });
});
