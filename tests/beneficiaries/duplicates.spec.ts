import { buildBeneficiary } from '../../fixtures/applicationData';
import { test } from '../../fixtures/auth.fixture';
import { applicationReadyForRiders } from '../../utils/testHelpers';
import { appGap, tc } from '../../utils/testCase';

test(...tc('TC-BEN-08'), async ({ agent }) => {
  appGap('no duplicate-beneficiary check');
  const id = await applicationReadyForRiders(agent);
  await agent.beneficiaries.goto(id);

  const first = buildBeneficiary({ allocation: 50 });
  await agent.beneficiaries.add(first);
  await agent.beneficiaries.add({ ...first, allocation: 50 }); // same name, DOB and relationship

  await agent.beneficiaries.expectError(/duplicate|already|exists/i);
  await agent.beneficiaries.expectCount(1);
  await agent.beneficiaries.reload();
  await agent.beneficiaries.expectCount(1);
});
