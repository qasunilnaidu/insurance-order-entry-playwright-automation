import { expect, Locator } from '@playwright/test';
import { ClientData } from '../fixtures/applicationData';
import { BasePage } from './BasePage';

export class ClientInformationPage extends BasePage {
  readonly firstName: Locator = this.field('client-first-name-input', /first name/i);
  readonly lastName: Locator = this.field('client-last-name-input', /last name|surname/i);
  readonly dob: Locator = this.field('client-dob-input', /date of birth|dob/i);
  readonly gender: Locator = this.field('client-gender-select', /gender/i);
  readonly maritalStatus: Locator = this.field('client-marital-status-select', /marital/i);
  readonly nationality: Locator = this.field('client-nationality-input', /nationality/i);
  readonly occupation: Locator = this.field('client-occupation-input', /occupation/i);
  readonly employer: Locator = this.field('client-employer-name-input', /employer name/i);
  readonly employerAddress: Locator = this.field('client-employer-address-input', /employer address/i);
  readonly age: Locator = this.testId('calculated-age').or(this.page.getByText(/age\s*[:\-]?\s*\d+/i)).first();

  async goto(applicationId: string): Promise<void> {
    await this.open(`/applications/${applicationId}/client`);
  }

  async fill(data: ClientData): Promise<void> {
    await this.set(this.firstName, data.firstName);
    await this.set(this.lastName, data.lastName);
    await this.typeDob(data.dob);
    await this.set(this.gender, data.gender);
    await this.set(this.maritalStatus, data.maritalStatus);
    await this.set(this.nationality, data.nationality);
    await this.set(this.occupation, data.occupation);
    await this.set(this.employer, data.employer);
    // employer_address is a required field in this build.
    if (await this.employerAddress.isVisible().catch(() => false)) {
      await this.set(this.employerAddress, `${data.employer} HQ, 500 Congress Ave, Austin`);
    }
  }

  /** Accepts valid and malformed DOB text alike (see BasePage.typeRaw). */
  async typeDob(value: string): Promise<void> {
    await this.typeRaw(this.dob, value);
  }

  async setDob(dob: string): Promise<void> {
    await this.typeDob(dob);
  }

  async clearAll(): Promise<void> {
    for (const control of [this.firstName, this.lastName, this.dob, this.occupation, this.employer]) {
      await this.typeRaw(control, '');
    }
  }

  async values(): Promise<Record<string, string>> {
    return {
      firstName: await this.displayValue(this.firstName),
      lastName: await this.displayValue(this.lastName),
      dob: await this.displayValue(this.dob),
      occupation: await this.displayValue(this.occupation),
      employer: await this.displayValue(this.employer),
    };
  }

  /** Age number shown next to the DOB, or null when no age is displayed. */
  async displayedAge(): Promise<number | null> {
    if (!(await this.age.isVisible().catch(() => false))) return null;
    const match = (await this.age.innerText()).match(/age\s*[:\-]?\s*(\d+)|(\d+)/i);
    return match ? Number(match[1] ?? match[2]) : null;
  }

  async expectAge(expected: number): Promise<void> {
    await expect.poll(() => this.displayedAge()).toBe(expected);
  }

  async expectNoAgeShown(): Promise<void> {
    await expect.poll(() => this.displayedAge()).toBeNull();
  }
}
