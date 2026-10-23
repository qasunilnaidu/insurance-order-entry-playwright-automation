import { test, expect } from '../../fixtures/auth.fixture';
import { requireApi } from '../../utils/apiCrossCheck';
import { findDeep, parseMoney } from '../../utils/assertions';
import { applicationReadyForProduct, applicationReadyForReview, configureProduct } from '../../utils/testHelpers';
import { buildPolicy } from '../../fixtures/applicationData';
import { tc } from '../../utils/testCase';

const FREQUENCIES = ['Monthly', 'Quarterly', 'Semi-annual', 'Annual'];

async function availableFrequencies(options: string[]): Promise<string[]> {
  return FREQUENCIES.filter((f) => options.some((o) => o.toLowerCase().replace(/[- ]/g, '') === f.toLowerCase().replace(/[- ]/g, '')))
    .map((f) => options.find((o) => o.toLowerCase().replace(/[- ]/g, '') === f.toLowerCase().replace(/[- ]/g, '')) as string);
}

test.describe('Premium calculation', () => {
  test(...tc('TC-PROD-05'), async ({ agent }) => {
    const id = await applicationReadyForProduct(agent);
    await configureProduct(agent, id, buildPolicy({ frequency: 'Monthly' }));
    const frequencies = await availableFrequencies(await agent.product.frequencyOptions());
    expect(frequencies.length).toBeGreaterThan(1);

    const seen = new Map<string, number>();
    for (const frequency of frequencies) {
      await agent.product.setFrequency(frequency);
      await expect.poll(() => agent.product.readPremium()).toBeGreaterThan(0);
      seen.set(frequency, await agent.product.readPremium());
    }
    // Each frequency gives its own displayed premium
    expect(new Set(seen.values()).size, `premiums per frequency: ${JSON.stringify([...seen])}`).toBe(seen.size);
  });

  test(...tc('TC-PROD-06'), async ({ agent }) => {
    const app = await applicationReadyForReview(agent);
    const reviewPremium = await agent.review.readPremium();
    expect(reviewPremium).toBeCloseTo(app.premium, 2);
  });

  test(...tc('TC-PROD-14'), async ({ agent, api }) => {
    requireApi(api, 'UI premium vs GET application');
    const id = await applicationReadyForProduct(agent);
    await configureProduct(agent, id, buildPolicy({ frequency: 'Monthly' }));
    const frequencies = await availableFrequencies(await agent.product.frequencyOptions());

    for (const frequency of frequencies) {
      await agent.product.setFrequency(frequency);
      await expect.poll(() => agent.product.readPremium()).toBeGreaterThan(0);
      const uiPremium = await agent.product.readPremium();
      await agent.product.nextStep();

      const { status, body } = await api.getJson(`/api/applications/${id}`);
      expect(status).toBe(200);
      const apiValue = findDeep(body, /^(premium|totalPremium|modalPremium|basePremium)$/i);
      test.skip(apiValue === undefined, 'API does not expose a premium field (Open Items)');
      const apiPremium = typeof apiValue === 'number' ? apiValue : parseMoney(String(apiValue));
      expect(apiPremium, `API premium for ${frequency}`).toBeCloseTo(uiPremium, 2);
      await agent.product.goto(id);
      await agent.product.setFrequency(frequency);
    }
  });
});
