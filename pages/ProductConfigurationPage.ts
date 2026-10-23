import { Locator } from '@playwright/test';
import { PolicyConfig } from '../fixtures/applicationData';
import { lastMoney } from '../utils/assertions';
import { BasePage } from './BasePage';

export interface ProductValues {
  faceValue: string;
  frequency: string;
  paymentTerm: string;
  policyTerm: string;
  premium: number;
}

export class ProductConfigurationPage extends BasePage {
  readonly productSelect: Locator = this.field('product-select', /^product$|select product/i);
  readonly faceValue: Locator = this.field('product-sum-assured-input', /face value|sum assured|coverage amount/i);
  readonly frequency: Locator = this.field('product-premium-frequency-select', /premium frequency|payment frequency/i);
  readonly paymentTerm: Locator = this.field('product-payment-term-select', /payment term/i);
  readonly policyTerm: Locator = this.field('product-coverage-term-select', /policy term|coverage term/i);
  readonly premium: Locator = this.testId('product-current-total-premium');
  readonly warning: Locator = this.testId('suitability-warning').or(this.page.getByText(/suitab|afford|not recommended|mismatch|eligib/i)).first();

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/product`);
  }

  async selectProduct(name?: string): Promise<void> {
    if (!(await this.productSelect.isVisible().catch(() => false))) return;
    if (name) {
      await this.choose(this.productSelect, name);
    } else {
      await this.productSelect.click();
      await this.page.getByRole('option').first().click();
    }
  }

  async configure(config: PolicyConfig): Promise<void> {
    await this.setFaceValue(config.faceValue);
    await this.choose(this.frequency, config.frequency);
    if (config.paymentTerm && (await this.paymentTerm.isVisible().catch(() => false))) {
      await this.set(this.paymentTerm, config.paymentTerm);
    }
    if (config.policyTerm && (await this.policyTerm.isVisible().catch(() => false))) {
      await this.set(this.policyTerm, config.policyTerm);
    }
  }

  /** Accepts numbers and invalid text such as "abc" or "100000.55". */
  async setFaceValue(value: number | string): Promise<void> {
    await this.typeRaw(this.faceValue, String(value));
  }

  async setFrequency(value: string): Promise<void> {
    await this.choose(this.frequency, value);
  }

  async readPremium(): Promise<number> {
    return lastMoney(await this.premium.innerText());
  }

  async frequencyOptions(): Promise<string[]> {
    return this.optionsOf(this.frequency);
  }

  async paymentTermOptions(): Promise<string[]> {
    return (await this.optionsOf(this.paymentTerm)).filter((o) => !/^(select|choose|--)/i.test(o));
  }

  async readValues(): Promise<ProductValues> {
    return {
      faceValue: (await this.displayValue(this.faceValue)).replace(/[^0-9.]/g, ''),
      frequency: (await this.displayValue(this.frequency)).trim(),
      paymentTerm: (await this.displayValue(this.paymentTerm).catch(() => '')).trim(),
      policyTerm: (await this.displayValue(this.policyTerm).catch(() => '')).trim(),
      premium: await this.readPremium(),
    };
  }
}
