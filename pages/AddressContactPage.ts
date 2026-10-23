import { expect, Locator } from '@playwright/test';
import { AddressData } from '../fixtures/applicationData';
import { BasePage } from './BasePage';

export class AddressContactPage extends BasePage {
  readonly resLine1: Locator = this.field('residential[address_line_1]', /residential.*(address|line 1)|address line 1/i);
  readonly resCity: Locator = this.field('residential[city]', /residential.*city|^city/i);
  readonly resState: Locator = this.field('residential-state-province-select', /residential.*state|^state/i);
  readonly resPostal: Locator = this.field('residential[postal_code]', /residential.*(postal|zip)|postal code|zip/i);
  readonly resCountry: Locator = this.field('residential[country]', /residential.*country|^country/i);

  readonly sameAsResidential: Locator = this.page
    .getByTestId('address-same-as-residential-checkbox')
    .or(this.page.getByLabel(/same as residential/i))
    .first();

  readonly mailLine1: Locator = this.field('mailing[address_line_1]', /mailing.*(address|line 1)/i);
  readonly mailCity: Locator = this.field('mailing[city]', /mailing.*city/i);
  readonly mailState: Locator = this.field('mailing-state-province-select', /mailing.*state/i);
  readonly mailPostal: Locator = this.field('mailing[postal_code]', /mailing.*(postal|zip)/i);

  readonly email: Locator = this.field('primary_email', /email/i);
  readonly mobile: Locator = this.field('mobile_number', /mobile|cell/i);
  readonly alternatePhone: Locator = this.field('alternate_phone_number', /alternate|secondary phone/i);
  readonly preferredContact: Locator = this.field('contact-preferred-mode-select', /preferred (mode|contact|communication)/i);

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/address-contact`);
  }

  async fillResidential(data: AddressData): Promise<void> {
    await this.set(this.resLine1, data.line1);
    await this.set(this.resCity, data.city);
    await this.set(this.resState, data.state);
    await this.typeRaw(this.resPostal, data.postalCode);
    if (await this.resCountry.isVisible().catch(() => false)) {
      await this.set(this.resCountry, data.country);
    }
  }

  async fillContact(data: AddressData): Promise<void> {
    await this.typeRaw(this.email, data.email);
    await this.typeRaw(this.mobile, data.mobile);
    if (await this.alternatePhone.isVisible().catch(() => false)) {
      await this.typeRaw(this.alternatePhone, data.alternatePhone);
    }
    if (data.preferredContact && (await this.preferredContact.isVisible().catch(() => false))) {
      await this.set(this.preferredContact, data.preferredContact);
    }
  }

  /** Fills everything and uses the same-as-residential shortcut. */
  async fillAll(data: AddressData): Promise<void> {
    await this.fillResidential(data);
    await this.sameAsResidential.check();
    await this.fillContact(data);
  }

  /** Leaves the (residential) state unselected. */
  async clearState(): Promise<void> {
    const tag = await this.resState.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') await this.resState.selectOption({ index: 0 });
    else await this.resState.fill('');
  }

  async expectMailingCopiedFrom(data: AddressData): Promise<void> {
    await expect(this.mailLine1).toHaveValue(data.line1);
    await expect(this.mailCity).toHaveValue(data.city);
    await expect(this.mailPostal).toHaveValue(data.postalCode);
  }

  async expectMailingEditable(): Promise<void> {
    await expect(this.mailLine1).toBeEditable();
    await expect(this.mailCity).toBeEditable();
    await expect(this.mailPostal).toBeEditable();
  }
}
