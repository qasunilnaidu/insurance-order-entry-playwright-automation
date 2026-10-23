import { expect, Locator } from '@playwright/test';
import { lastMoney } from '../utils/assertions';
import { BasePage } from './BasePage';

export class ReviewPage extends BasePage {
  readonly validationSummary: Locator = this.testId('review-validation-errors').or(this.testId('validation-summary')).or(this.page.getByRole('region', { name: /validation/i })).or(this.page.getByText(/validation (summary|errors)|please (fix|resolve)/i)).first();
  readonly summaryItems: Locator = this.page.locator('[data-testid="validation-error-item"], [data-testid="review-validation-errors"] li, [data-testid="validation-summary"] li, [data-testid="validation-summary"] a');
  readonly submitButton: Locator = this.button(/submit( application)?/i, 'submit-application-button');
  readonly premium: Locator = this.testId('review-total-premium').or(this.page.getByText(/(total )?premium.*[\d,]+/i)).first();

  readonly calculatedAge: Locator = this.testId('review-client-calculated-age');

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/review`);
  }

  /** "Calculated Age" from the application snapshot (the client step itself shows no age). */
  async readCalculatedAge(): Promise<number> {
    return Number((await this.calculatedAge.innerText()).match(/\d+/)?.[0]);
  }

  async readPremium(): Promise<number> {
    return lastMoney(await this.premium.innerText());
  }

  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  async expectSubmitEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
    await this.confirmSubmissionIfAsked();
  }

  /** Rapid double click on Submit (duplicate submission risk QR-09). */
  async doubleClickSubmit(): Promise<void> {
    await this.submitButton.dblclick();
    await this.confirmSubmissionIfAsked();
  }

  private async confirmSubmissionIfAsked(): Promise<void> {
    const confirm = this.page.getByRole('dialog').getByRole('button', { name: /confirm|yes|submit/i });
    if (await confirm.first().isVisible().catch(() => false)) await confirm.first().click();
  }

  async summaryTexts(): Promise<string[]> {
    return (await this.summaryItems.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  }

  /** All text of the summary area (items, or the region text when items are not list elements). */
  async summaryText(): Promise<string> {
    if (await this.summaryItems.count()) return (await this.summaryTexts()).join('\n');
    return (await this.validationSummary.innerText().catch(() => '')).trim();
  }

  async expectSummaryListsErrors(minimum = 1): Promise<void> {
    await expect(this.validationSummary).toBeVisible();
    expect(await this.summaryItems.count()).toBeGreaterThanOrEqual(minimum);
  }

  async expectSummaryClean(): Promise<void> {
    await expect(this.summaryItems).toHaveCount(0);
  }

  async clickFirstSummaryItem(): Promise<void> {
    await this.summaryItems.first().click();
  }

  /** Page text with thousands separators removed, for number comparisons. */
  async pageDigits(): Promise<string> {
    return (await this.bodyText()).replace(/,/g, '');
  }

  /** The review page does not mention the given text (e.g. a removed rider). */
  async expectNotInSummaryText(text: string): Promise<void> {
    await expect(this.page.locator('body')).not.toContainText(text);
  }
}
