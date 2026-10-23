import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { findDeep, normalizeStatus } from '../../utils/assertions';
import { applicationReadyForRiders, applicationReadyForReview, submitCompleteApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Submission behaviour', () => {
  test(...tc('TC-WF-04'), async ({ agent, api }) => {
    const app = await submitCompleteApplication(agent);
    for (const open of [() => agent.status.gotoDetail(app.id), () => agent.client.goto(app.id)]) {
      await open();
      await agent.status.expectReadOnly();
    }
    // Backend: updating a submitted application is rejected
    await apiCrossCheck(api, 'POST client on a submitted application', async () => {
      const res = await api.post(`/api/applications/${app.id}/client`, { firstName: 'Changed' });
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    });
  });

  test(...tc('TC-WF-05'), async ({ agent }) => {
    await submitCompleteApplication(agent);
    await expect(agent.confirmation.successMessage).toBeVisible();
  });

  test(...tc('TC-WF-06'), async ({ agent }) => {
    const app = await submitCompleteApplication(agent);
    await agent.dashboard.goto();
    // Submitted rows are listed by reference number (e.g. WL2026...), drafts as "Draft #<id>"
    expect(normalizeStatus(await agent.dashboard.statusOf(app.reference))).toBe('submitted');
  });

  test(...tc('TC-WF-11'), async ({ agent, api }) => {
    const app = await applicationReadyForReview(agent);
    await agent.review.doubleClickSubmit();
    await agent.confirmation.expectSuccess();
    const reference = await agent.confirmation.readReferenceNumber();

    // Second submit through the API is rejected or idempotent
    await apiCrossCheck(api, 'second POST submit + GET status', async () => {
      const res = await api.post(`/api/applications/${app.id}/submit`, {});
      const body = await api.json(res);
      if (res.ok()) {
        const again = findDeep(body, /^(reference|referenceNumber|reference_number)$/i);
        if (again !== undefined) expect(String(again)).toBe(reference);
      } else {
        expect(res.status()).toBeLessThan(500);
      }

      const { body: statusBody } = await api.getJson(`/api/applications/${app.id}/status`);
      expect(JSON.stringify(statusBody).toLowerCase()).toContain('submitted');
      const submittedEntries = (JSON.stringify(statusBody).match(/"submitted"/gi) ?? []).length;
      expect(submittedEntries, 'one Submitted entry (status + one history entry)').toBeLessThanOrEqual(2);
    });
  });

  test(...tc('TC-WF-12'), async ({ agent }) => {
    const id = await applicationReadyForRiders(agent);
    await agent.confirmation.goto(id);
    await expect(agent.confirmation.successMessage).toBeHidden();
    await expect(agent.confirmation.referenceNumber).toBeHidden();
    await expect(agent.page).not.toHaveURL(/\/confirmation/);
  });
});
