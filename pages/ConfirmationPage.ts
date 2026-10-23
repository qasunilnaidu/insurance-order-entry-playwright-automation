import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ConfirmationPage extends BasePage {
  readonly successMessage: Locator = this.testId('submission-confirmation-page').or(this.page.getByText(/submitted successfully|application (has been )?submitted/i)).first();
  // The reference renders bare (no "Reference No:" label) inside this testid.
  readonly referenceNumber: Locator = this.testId('confirmation-reference-number').or(this.page.getByText(/(reference|application) (no\.?|number|id)\s*[:\-]?\s*\S+/i)).first();

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/confirmation`);
  }

  async expectSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/\/confirmation/);
    await expect(this.successMessage).toBeVisible();
  }

  async readReferenceNumber(): Promise<string> {
    await expect(this.referenceNumber).toBeVisible();
    const text = (await this.referenceNumber.innerText()).trim();
    const match = text.match(/[A-Z0-9][A-Z0-9\-]{5,}/i);
    return match ? match[0] : text;
  }
}
