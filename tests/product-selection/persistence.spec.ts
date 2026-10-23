import { buildPolicy } from '../../fixtures/applicationData';
import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForProduct, saveProduct } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-PROD-09'), async ({ agent }) => {
  const id = await applicationReadyForProduct(agent);
  const policy = buildPolicy({ faceValue: 150000, frequency: 'Quarterly' });
  await agent.product.goto(id);
  await saveProduct(agent, id, policy);
  await agent.product.goto(id);
  const before = await agent.product.readValues();

  // Go to the dashboard and resume the draft
  await agent.dashboard.goto();
  await agent.dashboard.resumeDraft(id);
  await agent.product.goto(id);
  const after = await agent.product.readValues();

  // The app stores decimals ("150000.00"), so compare the amount, not the string
  expect(Number(after.faceValue)).toBe(policy.faceValue);
  expect(after.frequency.toLowerCase()).toContain(policy.frequency.toLowerCase().slice(0, 4));
  expect(after).toEqual(before);
});
