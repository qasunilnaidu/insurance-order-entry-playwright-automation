import { buildClient } from '../../fixtures/applicationData';
import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { startApplication } from '../../utils/testHelpers';
import { normalizeStatus } from '../../utils/assertions';
import { tc } from '../../utils/testCase';

test.describe('Draft handling', () => {
  test(...tc('TC-WF-01'), async ({ agent, api }) => {
    const id = await startApplication(agent);
    await agent.client.goto(id);
    await agent.client.firstName.fill('Partial');
    await agent.client.saveDraft();

    await agent.dashboard.goto();
    expect(await agent.dashboard.rowIds()).toContain(id);
    expect(normalizeStatus(await agent.dashboard.statusOf(id))).toBe('draft');

    await apiCrossCheck(api, 'GET status', async () => {
      const { body } = await api.getJson(`/api/applications/${id}/status`);
      expect(JSON.stringify(body).toLowerCase()).toContain('draft');
    });
  });

  test(...tc('TC-WF-02'), async ({ agent }) => {
    const id = await startApplication(agent);
    const data = buildClient();
    await agent.client.goto(id);
    await agent.client.fill(data);
    await agent.client.saveDraft();

    await agent.dashboard.goto();
    await agent.dashboard.resumeDraft(id);
    await expect(agent.page).toHaveURL(new RegExp(`/applications/${id}`));
    await agent.client.goto(id);
    const values = await agent.client.values();
    expect(values.firstName).toBe(data.firstName);
    expect(values.lastName).toBe(data.lastName);
    expect(values.dob).toBe(data.dob);
  });
});
