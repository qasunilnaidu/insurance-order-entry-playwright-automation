import { buildKyc, buildPolicy } from '../../fixtures/applicationData';
import { test, expect } from '../../fixtures/auth.fixture';
import { env } from '../../utils/env';
import { completeAddress, completeClient, completeKyc, configureProduct, startApplication } from '../../utils/testHelpers';
import { seededDefect, tc } from '../../utils/testCase';

test(...tc('TC-PROD-07'), async ({ agent }) => {
  seededDefect('DEF-FIN-001');
  const id = await startApplication(agent);
  await completeClient(agent, id);
  await completeAddress(agent, id);
  await completeKyc(agent, id, buildKyc({ riskProfile: 'CONSERVATIVE' })); // lowest risk profile in the app

  await configureProduct(agent, id, buildPolicy({ faceValue: env.faceValueMax }));
  await expect(agent.product.warning).toBeVisible();
});
