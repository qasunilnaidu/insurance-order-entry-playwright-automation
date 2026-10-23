import { buildBeneficiary } from '../../fixtures/applicationData';
import { dobs } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForRiders } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-BEN-05'), async ({ agent }) => {
  const id = await applicationReadyForRiders(agent);
  await agent.beneficiaries.goto(id);

  const minor = buildBeneficiary({ dob: dobs.minor, relationship: 'Child' });
  await agent.beneficiaries.fillForm(minor);
  await expect(agent.beneficiaries.guardianName).toBeVisible();

  // Guardian left blank: save blocked
  await agent.beneficiaries.saveButton.click();
  await agent.beneficiaries.expectError(/guardian/i);
  await agent.beneficiaries.expectCount(0);

  // Guardian filled (the app requires name, contact and address): accepted.
  // The failed save reloads the form, so fill it again first.
  await agent.beneficiaries.fillForm(minor);
  await agent.beneficiaries.guardianName.fill('Guardian Parent');
  if (await agent.beneficiaries.guardianRelationship.isVisible().catch(() => false)) {
    await agent.beneficiaries.guardianRelationship.fill('Parent');
  }
  await agent.beneficiaries.guardianContact.fill('(212) 555-1212');
  await agent.beneficiaries.guardianAddress.fill('500 Congress Ave, Austin, TX 78701');
  await agent.beneficiaries.saveButton.click();
  await agent.beneficiaries.expectCount(1);
});
