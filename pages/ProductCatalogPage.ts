import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductCatalogPage extends BasePage {
  readonly search: Locator = this.field('product-search', /search/i);
  // Real markup: data-testid="product-card-{product_code}".
  readonly cards: Locator = this.page.locator('[data-testid^="product-card-"], [data-testid="product-card"], .product-card');
  readonly emptyResult: Locator = this.testId('empty-result').or(this.page.getByText(/no (products|results|matches)|nothing found/i)).first();

  async goto(): Promise<void> {
    await this.open('/products');
  }

  async gotoDetail(productId: string): Promise<void> {
    await this.open(`/products/${productId}`);
  }

  async expectProductsListed(): Promise<void> {
    await expect(this.cards.first()).toBeVisible();
    expect(await this.cards.count()).toBeGreaterThan(0);
  }

  async names(): Promise<string[]> {
    const texts = await this.cards.locator('h2, h3, h4, [data-testid="product-name"]').allInnerTexts();
    return texts.map((t) => t.trim()).filter(Boolean);
  }

  cardFor(productName: string): Locator {
    return this.cards.filter({ hasText: productName }).first();
  }

  async openProduct(productName?: string): Promise<void> {
    const card = productName ? this.cardFor(productName) : this.cards.first();
    await card.getByRole('link', { name: /view|details|learn more|select/i }).or(card.getByRole('button', { name: /view|details|learn more|select/i })).or(card).first().click();
    await this.page.waitForURL(/\/products\/[^/]+/);
  }

  async searchFor(term: string): Promise<void> {
    await this.search.fill(term);
    await this.search.press('Enter');
  }

  async clearSearch(): Promise<void> {
    await this.search.fill('');
    await this.search.press('Enter');
  }

  async expectDetailSections(): Promise<void> {
    for (const section of [/features?|benefits?/i, /eligibility/i, /coverage|face value|limits?/i]) {
      await expect(this.page.getByText(section).first()).toBeVisible();
    }
  }

  /** Product id from the /products/:productId URL. */
  productIdFromUrl(): string {
    const match = this.page.url().match(/\/products\/([^/?#]+)/);
    if (!match) throw new Error(`Not on a product detail page: ${this.page.url()}`);
    return match[1];
  }
}
