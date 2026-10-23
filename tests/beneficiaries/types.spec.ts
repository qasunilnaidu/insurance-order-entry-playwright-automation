import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForRiders } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Beneficiary types', () => {
  test.beforeEach(async ({ agent }) => {
    const id = await applicationReadyForRiders(agent);
    await agent.beneficiaries.goto(id);
    await agent.beneficiaries.openForm();
    // Level is required by the browser; without it the submit is blocked before the type-specific fields.
    await agent.beneficiaries.set(agent.beneficiaries.category, 'Primary');
  });

  test(...tc('TC-BEN-06'), async ({ agent }) => {
    await agent.beneficiaries.chooseType('Trust');
    for (const field of [agent.beneficiaries.trustName, agent.beneficiaries.trusteeName, agent.beneficiaries.trustDate]) {
      await expect(field).toBeVisible();
    }
    // Mandatory: saving with empty trust fields is blocked
    // Server-side rule: reported in the beneficiary error summary, not inline
    await agent.beneficiaries.saveButton.click();
    await agent.beneficiaries.expectError(/trust/i);
    await agent.beneficiaries.expectCount(0);
  });

  test(...tc('TC-BEN-07'), async ({ agent }) => {
    await agent.beneficiaries.chooseType('Organization');
    for (const field of [agent.beneficiaries.organizationName, agent.beneficiaries.registrationNumber, agent.beneficiaries.contactEmail]) {
      await expect(field).toBeVisible();
    }
    // Organization Name is the mandatory organization field (Registration Number is optional in the app);
    // the server reports it in the beneficiary error summary, not inline
    await agent.beneficiaries.saveButton.click();
    await agent.beneficiaries.expectError(/organi[sz]ation/i);
    await agent.beneficiaries.expectCount(0);
  });
});
