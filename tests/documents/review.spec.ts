import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForReview } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-VAL-05'), async ({ agent }) => {
  const app = await applicationReadyForReview(agent);
  const page = (await agent.review.pageDigits()).toLowerCase();

  // The review "Application Snapshot" shows client, age, product and premium details only
  // (no address, beneficiary or document section), so those are what is compared.
  expect(page).toContain(app.client.firstName.toLowerCase());
  expect(page).toContain(app.client.lastName.toLowerCase());
  expect(await agent.review.readCalculatedAge()).toBeGreaterThan(0);
  expect(page).toContain(String(app.policy.faceValue));
  expect(page).toContain(app.policy.frequency.toLowerCase());
  expect(await agent.review.readPremium()).toBeCloseTo(app.premium, 2);
});
