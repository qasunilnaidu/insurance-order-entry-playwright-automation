import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ApplicationStatusPage extends BasePage {
  readonly currentStatus: Locator = this.testId('current-status').or(this.page.getByText(/status\s*[:\-]?\s*\w+/i)).first();
  readonly historyRows: Locator = this.page.locator('[data-testid="status-history-row"], [data-testid="status-history"] li, table tbody tr');

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/status`);
  }

  async gotoDetail(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}`);
  }

  async readStatus(): Promise<string> {
    await expect(this.currentStatus).toBeVisible();
    return (await this.currentStatus.innerText()).trim();
  }

  async expectHistoryHasEntries(): Promise<void> {
    await expect(this.historyRows.first()).toBeVisible();
  }

  /** Status history entries in displayed order (text of each row). */
  async historyEntries(): Promise<string[]> {
    return (await this.historyRows.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  }

  /** Submitted applications must be read-only: no enabled editable application fields. */
  async expectReadOnly(): Promise<void> {
    const editable = this.page.locator('input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])');
    const count = await editable.count();
    for (let i = 0; i < count; i++) {
      // Filters/search boxes outside the form are allowed; application fields are not
      const name = (await editable.nth(i).getAttribute('name')) ?? '';
      expect(name, `field "${name}" should not be editable after submission`).toMatch(/^$|search|filter/i);
    }
    await expect(this.page.getByRole('button', { name: /^(save|save draft|submit)/i })).toHaveCount(0);
  }
}
