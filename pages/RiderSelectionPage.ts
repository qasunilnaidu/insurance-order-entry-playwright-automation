import { expect, Locator } from '@playwright/test';
import { lastMoney } from '../utils/assertions';
import { BasePage } from './BasePage';

export class RiderSelectionPage extends BasePage {
  readonly premiumSummary: Locator = this.testId('rider-premium-summary').or(this.page.getByText(/premium summary|total premium/i)).first();
  readonly totalPremium: Locator = this.testId('total-premium').or(this.page.getByText(/total premium.*[\d,]+/i)).first();
  readonly questionnaire: Locator = this.testId('health-questionnaire').or(this.page.getByText(/health questionnaire|medical questions/i)).first();

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/riders`);
  }

  /** The card / row that represents a rider. */
  riderRow(name: string | RegExp): Locator {
    return this.page
      .locator('[data-testid="rider-card"], [data-testid="rider-row"], .rider-card, tr, li')
      .filter({ hasText: name })
      .first();
  }

  riderToggle(name: string | RegExp): Locator {
    const row = this.riderRow(name);
    return row.getByRole('checkbox').or(row.getByRole('switch')).or(row.getByRole('button', { name: /add|select|remove/i })).first();
  }

  async riderNames(): Promise<string[]> {
    const names = await this.page
      .locator('[data-testid="rider-card"] h2, [data-testid="rider-card"] h3, [data-testid="rider-card"] h4, [data-testid="rider-name"]')
      .allInnerTexts();
    return names.map((n) => n.trim()).filter(Boolean);
  }

  async isSelected(name: string | RegExp): Promise<boolean> {
    const toggle = this.riderToggle(name);
    const type = await toggle.getAttribute('type').catch(() => null);
    if (type === 'checkbox') return toggle.isChecked();
    return (await toggle.getAttribute('aria-pressed').catch(() => null)) === 'true' || (await toggle.getAttribute('aria-checked').catch(() => null)) === 'true';
  }

  async select(name: string | RegExp): Promise<void> {
    const toggle = this.riderToggle(name);
    const type = await toggle.getAttribute('type').catch(() => null);
    if (type === 'checkbox') {
      await toggle.check();
    } else {
      await toggle.click();
    }
  }

  async deselect(name: string | RegExp): Promise<void> {
    const toggle = this.riderToggle(name);
    const type = await toggle.getAttribute('type').catch(() => null);
    if (type === 'checkbox') {
      await toggle.uncheck();
    } else {
      await toggle.click();
    }
  }

  async setCoverage(name: string | RegExp, amount: number): Promise<void> {
    const input = this.riderRow(name).locator('input[type="number"], input[name*="coverage" i], [data-testid="rider-coverage"]').first();
    await this.typeRaw(input, String(amount));
  }

  async expectInSummary(name: string | RegExp): Promise<void> {
    await expect(this.premiumSummary).toContainText(name);
  }

  async expectNotInSummary(name: string | RegExp): Promise<void> {
    await expect(this.premiumSummary).not.toContainText(name);
  }

  /** The itemized line for a rider in the premium summary. */
  itemizedLine(name: string | RegExp): Locator {
    return this.premiumSummary.locator('li, tr, [data-testid="premium-line"], div').filter({ hasText: name }).last();
  }

  async readRiderPremium(name: string | RegExp): Promise<number> {
    return lastMoney(await this.itemizedLine(name).innerText());
  }

  async expectDisabledOrBlocked(name: string | RegExp): Promise<void> {
    const toggle = this.riderToggle(name);
    if (await toggle.isDisabled()) return;
    await toggle.click({ force: true }).catch(() => undefined);
    await this.expectAnyError();
  }

  async readTotalPremium(): Promise<number> {
    return lastMoney(await this.totalPremium.innerText());
  }
}
