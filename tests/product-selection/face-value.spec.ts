import { invalidFaceValues } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { env } from '../../utils/env';
import { buildPolicy } from '../../fixtures/applicationData';
import { applicationReadyForProduct, configureProduct } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Face value validation', () => {
  let id: string;

  test.beforeEach(async ({ agent }) => {
    id = await applicationReadyForProduct(agent);
    // Fill every required field (payment/coverage term are required selects): otherwise the browser's
    // native `required` check blocks the submit and the face-value rule is never exercised.
    await configureProduct(agent, id, buildPolicy({ frequency: 'Monthly' }));
  });

  test(...tc('TC-PROD-03'), async ({ agent }) => {
    const below = String(env.faceValueMin - 1);
    await agent.product.setFaceValue(below);
    await agent.product.expectNextBlocked();
    await agent.product.expectError(/face value|minimum|min|at least|coverage/i);
    await agent.product.expectValueNotSaved(agent.product.faceValue, below);

    await agent.product.setFaceValue(env.faceValueMin);
    await agent.product.nextStep();
    await agent.product.expectNoErrors();
  });

  test(...tc('TC-PROD-04'), async ({ agent }) => {
    const above = String(env.faceValueMax + 1);
    await agent.product.setFaceValue(above);
    await agent.product.expectNextBlocked();
    await agent.product.expectError(/face value|maximum|max|exceed|at most|coverage/i);
    await agent.product.expectValueNotSaved(agent.product.faceValue, above);

    await agent.product.setFaceValue(env.faceValueMax);
    await agent.product.nextStep();
    await agent.product.expectNoErrors();
  });

  test(...tc('TC-PROD-12'), async ({ agent }) => {
    for (const bad of invalidFaceValues) {
      await agent.product.setFaceValue(bad);
      await agent.product.expectNextBlocked();
      await agent.product.expectError(/face value|invalid|number|required|amount|coverage/i);
      if (bad) await agent.product.expectValueNotSaved(agent.product.faceValue, bad);
      // Premium must not be calculated from invalid input
      const premiumText = await agent.product.premium.innerText().catch(() => '');
      expect(premiumText, `no premium for "${bad}"`).not.toMatch(/NaN|Infinity/i);
    }
  });
});
