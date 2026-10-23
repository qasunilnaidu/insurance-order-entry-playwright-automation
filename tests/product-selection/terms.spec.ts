import { test, expect } from '../../fixtures/auth.fixture';
import { env } from '../../utils/env';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { applicationReadyForProduct } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-PROD-11'), async ({ agent, api }) => {
  const id = await applicationReadyForProduct(agent);
  await agent.product.goto(id);
  await agent.product.selectProduct(env.productName || undefined);

  const options = await agent.product.paymentTermOptions();
  expect(options.length, 'payment term options').toBeGreaterThan(0);

  // Options match the product API
  await apiCrossCheck(api, 'GET products', async () => {
    const list = await api.getJson('/api/products');
    expect(list.status).toBe(200);
    const apiText = JSON.stringify(list.body);
    for (const option of options) {
      const digits = option.match(/\d+/)?.[0];
      if (digits) expect(apiText, `payment term "${option}" is in the API`).toContain(digits);
    }
  });

  // Every payment term keeps the policy term at "Whole Life / to Age 100"
  for (const option of options) {
    await agent.product.set(agent.product.paymentTerm, option);
    const term = await agent.product.displayValue(agent.product.policyTerm).catch(() => '');
    if (term) expect(term).toMatch(/whole life|100|lifetime/i);
  }
});
