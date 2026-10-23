/**
 * Date and identity helpers. Boundary DOBs use the same definitions as the
 * "Test Data" sheet of the design workbook and are computed relative to today.
 */

let counter = 0;

export function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter}${Math.floor(Math.random() * 1000)}`;
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** dd-mm-yyyy (used by the malformed-DOB data in TC-CLI-09). */
export function dmy(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${d}-${m}-${y}`;
}

/** today - years (+ extraDays). e.g. dobYearsAgo(18) = exactly 18 years ago. */
export function dateYearsAgo(years: number, extraDays = 0): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + extraDays);
  return d;
}

export const dobYearsAgo = (years: number, extraDays = 0): string => isoDate(dateYearsAgo(years, extraDays));

/** Age in whole years on a given day (the expected value the UI must display). */
export function ageOn(dob: string, on: Date = new Date()): number {
  const [y, m, d] = dob.split('-').map(Number);
  let age = on.getFullYear() - y;
  const hadBirthday = on.getMonth() + 1 > m || (on.getMonth() + 1 === m && on.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age;
}

/**
 * Backwards compatible helper: a DOB that makes the person comfortably `age` years old
 * (age years + 1 month). Use the boundary datasets in fixtures/testData.ts for BVA tests.
 */
export function dobForAge(age: number): string {
  const d = dateYearsAgo(age);
  d.setMonth(d.getMonth() - 1);
  return isoDate(d);
}

export function futureDate(daysAhead = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return isoDate(d);
}

export function pastDate(daysBack = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return isoDate(d);
}

export function randomFirstName(): string {
  const names = ['Aarav', 'Diya', 'Rohan', 'Meera', 'Kabir', 'Anaya', 'Vihaan', 'Isha'];
  return names[Math.floor(Math.random() * names.length)];
}

export function randomLastName(): string {
  const names = ['Sharma', 'Reddy', 'Iyer', 'Patel', 'Nair', 'Rao', 'Gupta', 'Menon'];
  return names[Math.floor(Math.random() * names.length)];
}

/** Alphabetic-only unique token (names reject digits) for searchable, traceable test records. */
export function uniqueAlpha(length = 8): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < length; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function randomEmail(prefix = 'qa'): string {
  return `${prefix}.${uniqueSuffix()}@example.com`;
}

/** Valid US (NANP) number: area code and exchange must both start with 2-9 (the app rejects 0/1). */
export function randomMobile(): string {
  const digits = (n: number) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
  const twoToNine = () => String(2 + Math.floor(Math.random() * 8));
  return `${twoToNine()}${digits(2)}${twoToNine()}${digits(2)}${digits(4)}`;
}
