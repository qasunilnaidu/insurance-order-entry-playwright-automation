import { expect, Locator } from '@playwright/test';
import { KycData } from '../fixtures/applicationData';
import { BasePage } from './BasePage';

export class KycFinancialPage extends BasePage {
  readonly idType: Locator = this.field('kyc-id-type-select', /id type|identification type/i);
  readonly idNumber: Locator = this.field('kyc-id-number-input', /id number|identification number|ssn/i);
  readonly issueDate: Locator = this.field('kyc-issue-date-input', /issue date/i);
  readonly expiryDate: Locator = this.field('kyc-expiry-date-input', /expiry date|expiration/i);
  readonly documentInput: Locator = this.page.locator('input[type="file"]').first();
  readonly uploadedItems: Locator = this.page.locator('[data-testid="uploaded-document"], [data-testid="document-row"], .uploaded-file');
  readonly uploadStatus: Locator = this.testId('upload-status').or(this.page.getByText(/uploaded|upload successful/i)).first();

  readonly annualIncome: Locator = this.field('financial-annual-income-input', /(annual )?income/i);
  readonly netWorth: Locator = this.field('financial-net-worth-input', /net worth/i);
  readonly sourceOfFunds: Locator = this.field('financial-source-of-funds-select', /source of funds/i);
  readonly riskProfile: Locator = this.field('financial-risk-profile-select', /risk profile/i);

  // PEP is a Yes/No <select>; the compliance declaration is a checkbox.
  readonly pep: Locator = this.field('compliance-pep-select', /pep|politically exposed/i);
  readonly declaration: Locator = this.field('compliance-declaration-checkbox', /compliance declaration/i);
  readonly pepDetails: Locator = this.field('compliance-pep-details-input', /pep (details|description)|political/i);

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/kyc-financial`);
  }

  /** Fills the page. `pep: null` leaves the PEP / compliance declaration unanswered. */
  async fill(data: KycData): Promise<void> {
    await this.choose(this.idType, data.idType);
    await this.idNumber.fill(data.idNumber);
    await this.fillDates(data.issueDate, data.expiryDate);
    await this.annualIncome.fill(data.annualIncome);
    await this.netWorth.fill(data.netWorth);
    await this.set(this.sourceOfFunds, data.sourceOfFunds);
    await this.set(this.riskProfile, data.riskProfile);
    // pep === null leaves the PEP answer and the compliance declaration unanswered.
    if (data.pep !== null) {
      await this.choose(this.pep, data.pep ? 'Yes' : 'No');
      if (await this.declaration.isVisible().catch(() => false)) {
        await this.declaration.check().catch(() => undefined);
      }
    }
  }

  async fillDates(issue: string, expiry: string): Promise<void> {
    if (await this.issueDate.isVisible().catch(() => false)) await this.typeRaw(this.issueDate, issue);
    if (await this.expiryDate.isVisible().catch(() => false)) await this.typeRaw(this.expiryDate, expiry);
  }

  async upload(filePath: string): Promise<void> {
    // The KYC/financial step has no document upload in this build (documents are a
    // separate workflow step); no-op when there is no file input on the page.
    if (await this.documentInput.count()) {
      await this.documentInput.setInputFiles(filePath);
    }
  }

  async chooseIdType(value: string): Promise<void> {
    await this.choose(this.idType, value);
  }

  async idTypeOptions(): Promise<string[]> {
    return (await this.optionsOf(this.idType)).filter((o) => !/^(select|choose|--)/i.test(o));
  }

  async enterIdNumber(value: string): Promise<void> {
    await this.idNumber.fill(value);
    await this.idNumber.blur();
  }

  /** Visible representation of the ID/SSN after it has been entered. */
  async displayedIdNumber(): Promise<string> {
    return (await this.displayValue(this.idNumber)).trim();
  }

  async setFinancials(income: string, netWorth: string): Promise<void> {
    await this.typeRaw(this.annualIncome, income);
    await this.typeRaw(this.netWorth, netWorth);
  }

  async expectNothingUploaded(): Promise<void> {
    await expect(this.uploadedItems).toHaveCount(0);
  }
}
