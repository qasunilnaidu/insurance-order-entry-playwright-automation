import { expect, Locator, Page } from '@playwright/test';
import { BeneficiaryData } from '../fixtures/applicationData';
import { BasePage } from './BasePage';

export class BeneficiaryPage extends BasePage {
  /**
   * The app uses native browser dialogs, not modals: confirm() on Remove and on an irrevocable
   * designation, alert() when an allocation would exceed 100%. Playwright silently dismisses
   * unhandled dialogs (which cancels a Remove), so answer them deliberately and keep the text.
   */
  readonly dialogMessages: string[] = [];
  private nextDialogAnswer: boolean | undefined;

  constructor(page: Page) {
    super(page);
    page.on('dialog', async (dialog) => {
      this.dialogMessages.push(dialog.message());
      const accept = this.nextDialogAnswer ?? true;
      this.nextDialogAnswer = undefined;
      await (accept ? dialog.accept() : dialog.dismiss()).catch(() => undefined);
    });
  }

  /** Clicks Save, answering the expected confirm() as given; returns the dialog text. */
  async saveAnsweringDialog(accept: boolean): Promise<string> {
    const seen = this.dialogMessages.length;
    this.nextDialogAnswer = accept;
    await this.saveButton.click();
    await expect.poll(() => this.dialogMessages.length, { message: 'a confirmation dialog appears' }).toBeGreaterThan(seen);
    await this.page.waitForLoadState('domcontentloaded');
    return this.dialogMessages[seen];
  }

  /** Inline error, or a native alert()/confirm() message raised by the page. */
  override async expectError(text: string | RegExp): Promise<void> {
    const pattern = typeof text === 'string' ? new RegExp(text, 'i') : text;
    if (this.dialogMessages.some((m) => pattern.test(m))) return;
    await super.expectError(text);
  }

  override get nextButton(): Locator {
    return this.testId('beneficiary-continue-button').or(super.nextButton).first();
  }

  // The beneficiaries step is a single inline form (no modal / add button).
  readonly addButton: Locator = this.button(/add (a )?beneficiary/i, 'add-beneficiary-button');
  readonly saveButton: Locator = this.field('beneficiary-save-button', /^(save|add|submit|update)( beneficiary)?$/i);
  readonly cards: Locator = this.page.locator('[data-testid^="beneficiary-row-"]');

  readonly type: Locator = this.field('beneficiary-type-select', /beneficiary type|^type$/i);
  readonly category: Locator = this.field('beneficiary-level-select', /level|category|primary.*secondary/i);
  readonly firstName: Locator = this.field('beneficiary-first-name-input', /first name/i);
  readonly lastName: Locator = this.field('beneficiary-last-name-input', /last name/i);
  readonly gender: Locator = this.field('beneficiary-gender-select', /gender/i);
  readonly dob: Locator = this.field('beneficiary-dob-input', /date of birth|dob/i);
  readonly relationship: Locator = this.field('beneficiary-relationship-select', /relationship/i);
  readonly allocation: Locator = this.field('beneficiary-allocation-input', /allocation|percentage|share/i);
  // Revocable / Irrevocable is a <select>, not a checkbox.
  readonly irrevocable: Locator = this.field('beneficiary-designation-select', /revocable|designation/i);
  readonly legalAcknowledgement: Locator = this.field('beneficiary-legal-acknowledgement-checkbox', /acknowledge|legal/i);

  readonly guardianName: Locator = this.field('beneficiary-guardian-name-input', /guardian.*name/i);
  readonly guardianRelationship: Locator = this.field('beneficiary-guardian-relationship-input', /guardian.*relationship/i);
  readonly guardianContact: Locator = this.field('beneficiary-guardian-contact-input', /guardian.*contact/i);
  readonly guardianAddress: Locator = this.field('beneficiary-guardian-address-input', /guardian.*address/i);
  readonly trustName: Locator = this.field('beneficiary-trust-name-input', /trust name/i);
  readonly trusteeName: Locator = this.field('beneficiary-trustee-name-input', /trustee/i);
  readonly trustDate: Locator = this.field('beneficiary-trust-date-input', /trust date/i);
  readonly organizationName: Locator = this.field('beneficiary-organization-name-input', /organi[sz]ation name/i);
  readonly registrationNumber: Locator = this.field('beneficiary-organization-registration-input', /registration/i);
  readonly contactEmail: Locator = this.field('beneficiary-organization-contact-input', /contact (email|details)|contact person/i);


  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/beneficiaries`);
  }

  async openForm(): Promise<void> {
    if (await this.addButton.isVisible().catch(() => false)) {
      await this.addButton.click();
    }
  }

  async chooseType(type: BeneficiaryData['type']): Promise<void> {
    await this.set(this.type, type);
  }

  /** Fills the beneficiary form (does not save it). */
  async fillForm(b: BeneficiaryData): Promise<void> {
    await this.openForm();
    await this.chooseType(b.type);
    if (await this.category.isVisible().catch(() => false)) await this.set(this.category, b.category);

    if (b.type === 'Individual') {
      const [first, ...rest] = b.name.split(' ');
      await this.firstName.fill(first);
      await this.lastName.fill(rest.join(' ') || first);
      if (await this.gender.isVisible().catch(() => false)) await this.choose(this.gender, 'MALE');
      await this.typeRaw(this.dob, b.dob);
      await this.set(this.relationship, b.relationship);
    } else if (b.type === 'Trust') {
      await this.trustName.fill(b.trustName ?? b.name);
      await this.trusteeName.fill(b.trusteeName ?? 'Trustee One');
      await this.trustDate.fill(b.trustDate ?? b.dob);
    } else {
      await this.organizationName.fill(b.organizationName ?? b.name);
      await this.registrationNumber.fill(b.registrationNumber ?? 'REG-12345');
      await this.contactEmail.fill(b.contactEmail ?? 'org.contact@example.com');
    }
    await this.typeRaw(this.allocation, String(b.allocation));

    if (b.guardianName) {
      await this.guardianName.fill(b.guardianName);
      if (await this.guardianRelationship.isVisible().catch(() => false)) {
        await this.guardianRelationship.fill(b.guardianRelationship ?? 'Parent');
      }
    }
    // Revocable (default) or Irrevocable designation is a required <select>.
    if (await this.irrevocable.isVisible().catch(() => false)) {
      await this.choose(this.irrevocable, b.irrevocable ? 'Irrevocable' : 'Revocable');
    }
    // The legal acknowledgement checkbox must be ticked to save.
    if (await this.legalAcknowledgement.isVisible().catch(() => false)) {
      await this.legalAcknowledgement.check().catch(() => undefined);
    }
  }

  async add(b: BeneficiaryData): Promise<void> {
    await this.fillForm(b);
    await this.saveButton.click();
  }

  /** Opens the edit form of a card and applies the changes (name and/or allocation). */
  async edit(index: number, changes: { name?: string; allocation?: number | string }): Promise<void> {
    // Edit is a link (data-testid="beneficiary-edit-{id}") that reloads the page in edit mode.
    await this.cards.nth(index).locator('[data-testid^="beneficiary-edit-"]').click();
    await this.page.waitForLoadState('domcontentloaded');
    if (changes.name !== undefined) {
      const [first, ...rest] = changes.name.split(' ');
      await this.firstName.fill(first);
      await this.lastName.fill(rest.join(' ') || first);
    }
    if (changes.allocation !== undefined) await this.typeRaw(this.allocation, String(changes.allocation));
    await this.saveButton.click();
  }

  /** Remove asks a native confirm(), which the dialog handler accepts. */
  async remove(index = 0): Promise<void> {
    const before = await this.cards.count();
    await this.cards.nth(index).locator('[data-testid^="beneficiary-delete-"]').click();
    await expect(this.cards).toHaveCount(before - 1);
  }

  /** One line for both levels: "Primary allocation: 60.00% | Secondary allocation: 0.00%". */
  readonly allocationSummary: Locator = this.testId('beneficiary-allocation-summary');

  async readAllocationTotal(category: 'Primary' | 'Secondary'): Promise<number> {
    const text = await this.allocationSummary.innerText();
    const match = text.match(new RegExp(`${category}\\s+allocation:\\s*(\\d+(?:\\.\\d+)?)\\s*%`, 'i'));
    if (!match) throw new Error(`No ${category} percentage found in "${text}"`);
    return Number(match[1]);
  }

  async names(): Promise<string[]> {
    return (await this.cards.allInnerTexts()).map((t) => t.trim());
  }

  async expectCount(count: number): Promise<void> {
    await expect(this.cards).toHaveCount(count);
  }
}
