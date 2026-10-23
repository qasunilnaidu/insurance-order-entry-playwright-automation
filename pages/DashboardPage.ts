import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly greeting: Locator = this.testId('user-greeting').or(this.page.getByText(/welcome|hello|good (morning|afternoon|evening)/i)).first();
  readonly draftSummary: Locator = this.testId('draft-summary').or(this.page.getByText(/draft/i)).first();
  readonly submittedSummary: Locator = this.testId('submitted-summary').or(this.page.getByText(/submitted/i)).first();
  readonly newApplicationButton: Locator = this.page
    .getByRole('button', { name: /new application|start (new )?application/i })
    .or(this.page.getByRole('link', { name: /new application|start (new )?application/i }))
    .or(this.testId('new-application-button'))
    .first();
  readonly emptyState: Locator = this.testId('empty-state').or(this.page.getByText(/no applications|get started|nothing here/i)).first();
  readonly emptyResult: Locator = this.testId('empty-result').or(this.page.getByText(/no (results|matches|applications) (found|match)|nothing found|no results/i)).first();
  readonly searchBox: Locator = this.field('search', /search/i);
  readonly rows: Locator = this.page.locator('[data-testid="application-row"], table tbody tr');

  async goto(): Promise<void> {
    await this.open('/dashboard');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard/);
    await expect(this.draftSummary).toBeVisible();
    await expect(this.submittedSummary).toBeVisible();
    await expect(this.newApplicationButton).toBeVisible();
  }

  /** Starts a new application and returns the generated application id. */
  async startNewApplication(): Promise<string> {
    await this.newApplicationButton.click();
    await this.page.waitForURL(/\/applications\//);
    if (/\/applications\/new\/?$/.test(this.page.url())) {
      // Some builds show an intro / confirmation step on /applications/new
      await this.button(/start|create|begin|continue/i, 'start-application-button').click();
      await this.page.waitForURL(/\/applications\/(?!new(\/|$))[^/]+/);
    }
    return this.applicationIdFromUrl();
  }

  rowFor(applicationId: string): Locator {
    return this.rows.filter({ hasText: applicationId }).first();
  }

  async rowCount(): Promise<number> {
    return this.rows.count();
  }

  /** Application ids of all visible rows (from data-application-id or the row link). */
  async rowIds(): Promise<string[]> {
    const ids = await this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const attr = row.getAttribute('data-application-id');
        if (attr) return attr;
        const href = row.querySelector('a[href*="/applications/"]')?.getAttribute('href') ?? '';
        return href.match(/\/applications\/([^/?#]+)/)?.[1] ?? '';
      }),
    );
    return ids.filter(Boolean);
  }

  async rowTexts(): Promise<string[]> {
    return (await this.rows.allInnerTexts()).map((t) => t.trim());
  }

  async statusOf(applicationId: string): Promise<string> {
    const row = this.rowFor(applicationId);
    await expect(row).toBeVisible();
    const status = row.locator('[data-testid="application-status"], [data-testid="status"], .status, .badge').first();
    return ((await status.count()) ? await status.innerText() : await row.innerText()).trim();
  }

  async filterBy(status: string): Promise<void> {
    const tab = this.page.getByRole('tab', { name: status }).or(this.page.getByRole('button', { name: status, exact: true }));
    if (await tab.first().isVisible().catch(() => false)) {
      await tab.first().click();
      return;
    }
    await this.choose(this.field('status-filter', /status/i), status);
  }

  async search(term: string): Promise<void> {
    await this.searchBox.fill(term);
    await this.searchBox.press('Enter');
  }

  async clearSearch(): Promise<void> {
    const clear = this.page.getByRole('button', { name: /clear|reset|×|x/i }).first();
    if (await clear.isVisible().catch(() => false)) {
      await clear.click();
    } else {
      await this.searchBox.fill('');
      await this.searchBox.press('Enter');
    }
  }

  async resumeDraft(applicationId: string): Promise<void> {
    const row = this.rowFor(applicationId);
    await row.getByRole('button', { name: /resume|continue|edit/i }).or(row.getByRole('link', { name: /resume|continue|edit|open/i })).first().click();
  }

  async expectRowsAllHaveStatus(status: string): Promise<void> {
    const count = await this.rows.count();
    expect(count, `expected at least one ${status} application`).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(this.rows.nth(i)).toContainText(new RegExp(status, 'i'));
    }
  }
}
