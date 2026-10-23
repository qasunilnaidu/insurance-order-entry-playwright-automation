import { test, expect } from '../../fixtures/auth.fixture';
import { env } from '../../utils/env';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { applicationReadyForProduct } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Product catalog', () => {
  test(...tc('TC-PROD-01'), async ({ agent }) => {
    await agent.catalog.goto();
    await agent.catalog.expectProductsListed();
    const names = await agent.catalog.names();
    expect(names.length).toBeGreaterThan(0);
    for (const expected of env.expectedProducts) {
      expect(names.join('|').toLowerCase()).toContain(expected.toLowerCase());
    }
  });

  test(...tc('TC-PROD-02'), async ({ agent }) => {
    await agent.catalog.goto();
    await agent.catalog.openProduct();
    await expect(agent.page).toHaveURL(/\/products\/[^/]+/);
    await agent.catalog.expectDetailSections();
  });

  test(...tc('TC-PROD-08'), async ({ agent, api }) => {
    test.skip(!env.inactiveProduct, 'INACTIVE_PRODUCT_NAME not configured (seed data - Open Items)');
    await agent.catalog.goto();
    const hidden = (await agent.catalog.names()).every((n) => !n.includes(env.inactiveProduct));
    if (!hidden) {
      const select = agent.catalog.cardFor(env.inactiveProduct).getByRole('button', { name: /select|configure|add/i });
      if (await select.count()) await expect(select.first()).toBeDisabled();
    }

    // Selecting it on the product step must not be possible either
    const id = await applicationReadyForProduct(agent);
    await agent.product.goto(id);
    const options = await agent.product.optionsOf(agent.product.productSelect).catch(() => [] as string[]);
    if (options.length) {
      expect(options.some((o) => o.includes(env.inactiveProduct)) && !hidden).toBe(false);
    }

    // Backend: the inactive product must not be configurable through the API
    await apiCrossCheck(api, 'GET products', async () => {
      const list = await api.getJson('/api/products');
      expect(list.status).toBe(200);
      expect(JSON.stringify(list.body)).not.toMatch(new RegExp(`"name"\\s*:\\s*"${env.inactiveProduct}"[^}]*"(active|isActive)"\\s*:\\s*true`, 'i'));
    });
  });

  test(...tc('TC-PROD-13'), async ({ agent }) => {
    await agent.catalog.goto();
    const all = await agent.catalog.names();
    expect(all.length).toBeGreaterThan(0);
    const term = (env.productName || all[0]).split(' ')[0];

    await agent.catalog.searchFor(term);
    await expect.poll(async () => (await agent.catalog.names()).length).toBeGreaterThan(0);
    for (const name of await agent.catalog.names()) expect(name.toLowerCase()).toContain(term.toLowerCase());

    await agent.catalog.searchFor('zzzz-no-such-product');
    await expect(agent.catalog.emptyResult).toBeVisible();

    await agent.catalog.clearSearch();
    await expect.poll(async () => (await agent.catalog.names()).length).toBe(all.length);
  });
});
