import { buildClient } from '../../fixtures/applicationData';
import { dobs, invalidNames } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { startApplication } from '../../utils/testHelpers';
import { seededDefect, tc } from '../../utils/testCase';

test.describe('Client / insured information', () => {
  let applicationId: string;

  test.beforeEach(async ({ agent }) => {
    applicationId = await startApplication(agent);
    await agent.client.goto(applicationId);
  });

  test(...tc('TC-CLI-01'), async ({ agent, api }) => {
    const data = buildClient({ dob: dobs.adult40 });
    await agent.client.fill(data);
    await agent.client.expectNextEnabled();
    await agent.client.nextStep();
    await agent.client.expectNoErrors();

    // Saved values persist when the step is revisited
    await agent.client.goto(applicationId);
    const values = await agent.client.values();
    expect(values.firstName).toBe(data.firstName);
    expect(values.lastName).toBe(data.lastName);
    expect(values.dob).toBe(data.dob);

    // Backend cross-check: GET client returns the saved values
    await apiCrossCheck(api, 'GET client', async () => {
      const { status, body } = await api.getJson(`/api/applications/${applicationId}/client`);
      expect(status).toBe(200);
      expect(JSON.stringify(body)).toContain(data.firstName);
    });
  });

  test(...tc('TC-CLI-02'), async ({ agent }) => {
    await agent.client.clearAll();
    await agent.client.nextButton.click({ force: true });

    // Each required field shows its own inline error; progression is blocked. Gender / marital status
    // selects have no blank option and nationality is prefilled (clearAll leaves it), so they cannot be empty.
    for (const control of [
      agent.client.firstName,
      agent.client.lastName,
      agent.client.dob,
      agent.client.occupation,
      agent.client.employer,
    ]) {
      await agent.client.expectFieldError(control);
    }
    await agent.client.expectUrl(/\/client/);

    // Nothing was saved
    await agent.client.reload();
    await expect(agent.client.firstName).toHaveValue('');
    await expect(agent.client.employer).toHaveValue('');
  });

  test(...tc('TC-CLI-08'), async ({ agent }) => {
    seededDefect('DEF-CLI-004');
    for (const badName of invalidNames) {
      await agent.client.fill(buildClient());
      await agent.client.typeRaw(agent.client.firstName, badName);
      await agent.client.expectNextBlocked();
      await agent.client.expectError(/name|letters|invalid|required/i);
      await agent.client.expectValueNotSaved(agent.client.firstName, badName);
    }

    // A valid name is accepted
    await agent.client.fill(buildClient({ firstName: 'Anita', lastName: 'Rao' }));
    await agent.client.nextStep();
    await agent.client.expectNoErrors();
  });
});
