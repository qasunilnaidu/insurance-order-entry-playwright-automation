import { buildBeneficiary } from '../../fixtures/applicationData';
import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForRiders } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-BEN-10'), async ({ agent }) => {
  const id = await applicationReadyForRiders(agent);
  await agent.beneficiaries.goto(id);
  const b = buildBeneficiary({ irrevocable: true });

  // Save -> legal confirmation (the app uses a native confirm(), not a modal); cancel keeps it unsaved
  await agent.beneficiaries.fillForm(b);
  const legalText = await agent.beneficiaries.saveAnsweringDialog(false);
  expect(legalText).toMatch(/irrevocable/i);
  await agent.beneficiaries.expectCount(0);

  // Retry and confirm -> saved
  await agent.beneficiaries.saveAnsweringDialog(true);
  await agent.beneficiaries.expectCount(1);
  expect((await agent.beneficiaries.names())[0]).toMatch(/irrevocable/i);
});
