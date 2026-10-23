import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DocumentUploadPage extends BasePage {
  readonly typeSelect: Locator = this.field('document-type-select', /document type/i);
  readonly fileInput: Locator = this.page.locator('input[type="file"]').first();
  readonly fileNameInput: Locator = this.field('document-file-name-input', /file name/i);
  readonly uploadButton: Locator = this.field('document-upload-button', /upload document/i);
  // The empty state ("No documents uploaded.") is itself a tbody row, so match real rows only.
  readonly uploadedItems: Locator = this.page.locator('[data-testid^="document-row-"]');
  readonly status: Locator = this.testId('documents-table').or(this.page.getByText(/uploaded|upload (successful|complete)/i)).first();

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/documents`);
  }

  /** Completes the real upload form: pick a type, attach the file, name it, submit. */
  async upload(filePath: string, type = 'KYC_ID'): Promise<void> {
    const fileName = filePath.split(/[\\/]/).pop() ?? 'upload.pdf';
    if (await this.typeSelect.isVisible().catch(() => false)) {
      await this.choose(this.typeSelect, type).catch(() => undefined);
    }
    await this.fileInput.setInputFiles(filePath);
    if (await this.fileNameInput.isVisible().catch(() => false)) {
      await this.fileNameInput.fill(fileName);
    }
    await this.uploadButton.click();
  }

  async expectUploaded(fileName: string): Promise<void> {
    await expect(this.page.getByText(fileName).first()).toBeVisible();
    await expect(this.status).toBeVisible();
  }

  async expectRejected(reason: RegExp): Promise<void> {
    await this.expectError(reason);
  }

  /** Rejected files must not be listed as uploaded. */
  async expectNothingUploaded(): Promise<void> {
    await expect(this.uploadedItems).toHaveCount(0);
  }

  async uploadedNames(): Promise<string[]> {
    return (await this.uploadedItems.allInnerTexts()).map((t) => t.trim());
  }
}
