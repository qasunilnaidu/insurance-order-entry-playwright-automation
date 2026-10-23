import { test, expect } from '../../fixtures/auth.fixture';
import { extractList, findDeep } from '../../utils/assertions';
import { tc } from '../../utils/testCase';

type Product = Record<string, unknown>;

test.describe('Products API', () => {
  test(...tc('TC-API-01'), async ({ api }) => {
    const { status, body } = await api.getJson('/api/products');
    expect(status).toBe(200);
    const products = extractList<Product>(body);
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(['string', 'number'], 'id').toContain(typeof p.id);
      expect(typeof p.name, 'name').toBe('string');
      expect(p.name).not.toBe('');
      expect(JSON.stringify(p).toLowerCase(), 'status/limits present').toMatch(/status|active/);
      expect(JSON.stringify(p).toLowerCase()).toMatch(/face|limit|min|max|coverage/);
    }
  });

  test(...tc('TC-API-07'), async ({ agent, api }) => {
    const list = extractList<Product>((await api.getJson('/api/products')).body);
    const first = list[0];
    const productId = String(first.id);
    const { status, body } = await api.getJson(`/api/products/${productId}`);
    expect(status).toBe(200);

    await agent.catalog.gotoDetail(productId);
    const ui = await agent.catalog.bodyText();
    expect(ui).toContain(String(findDeep(body, /^name$/i)));
    for (const key of [/^(minFaceValue|minimumFaceValue|minCoverage|min)$/i, /^(maxFaceValue|maximumFaceValue|maxCoverage|max)$/i]) {
      const value = findDeep(body, key);
      if (value !== undefined) expect(ui.replace(/,/g, '')).toContain(String(value));
    }
  });
});
