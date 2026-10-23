import { buildClient, buildPolicy } from '../../fixtures/applicationData';
import { test, expect } from '../../fixtures/auth.fixture';
import { dobForAge } from '../../utils/dataGenerator';
import { env } from '../../utils/env';
import { completeAddress, completeClient, completeKyc, configureProduct, startApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-PROD-10'), async ({ agent }) => {
  test.skip(!env.productMinAge && !env.productMaxAge, 'PRODUCT_MIN_AGE / PRODUCT_MAX_AGE not configured (Open Items)');

  // Out-of-range age first (the client step itself allows 18-65, so choose the product limit inside/outside it)
  const outOfRange = env.productMaxAge ? env.productMaxAge + 1 : env.productMinAge - 1;
  const inRange = env.productMaxAge ? env.productMaxAge : env.productMinAge;

  const blockedId = await startApplication(agent);
  await completeClient(agent, blockedId, buildClient({ dob: dobForAge(outOfRange) }));
  await completeAddress(agent, blockedId);
  await completeKyc(agent, blockedId);
  await configureProduct(agent, blockedId, buildPolicy());
  await agent.product.nextButton.click({ force: true });
  await agent.product.expectAnyError();
  await agent.product.reload();
  await expect(agent.page).toHaveURL(/\/product/);

  const okId = await startApplication(agent);
  await completeClient(agent, okId, buildClient({ dob: dobForAge(inRange) }));
  await completeAddress(agent, okId);
  await completeKyc(agent, okId);
  await configureProduct(agent, okId, buildPolicy());
  await agent.product.nextStep();
  await agent.product.expectNoErrors();
});
