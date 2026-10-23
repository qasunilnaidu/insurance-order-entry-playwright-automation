import { expect, Locator } from '@playwright/test';

/** Extracts a number from strings such as "$1,234.50" or "INR 12,500/month". */
export function parseMoney(text: string | null | undefined): number {
  const cleaned = (text ?? '').replace(/[^0-9.\-]/g, '');
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Could not parse a money value from "${text}"`);
  }
  return value;
}

/** Last money-looking figure in a text (e.g. "Total premium: $1,234.50" -> 1234.5). */
export function lastMoney(text: string): number {
  const matches = text.match(/-?\d[\d,]*(?:\.\d+)?/g);
  if (!matches) throw new Error(`No number found in "${text}"`);
  return parseMoney(matches[matches.length - 1]);
}

export async function readMoney(locator: Locator): Promise<number> {
  await expect(locator).toBeVisible();
  return lastMoney(await locator.innerText());
}

export async function expectMoneyEqual(actual: Locator, expected: number): Promise<void> {
  expect(await readMoney(actual)).toBeCloseTo(expected, 2);
}

/** Only the last four digits may be visible; everything else must be masked. */
export function expectMasked(displayedValue: string, last4: string): void {
  expect(displayedValue).toContain(last4);
  const visibleDigits = displayedValue.replace(/\D/g, '');
  expect(visibleDigits, 'only the last four digits may be visible').toBe(last4);
}

/** Pulls an array out of common API response envelopes. */
export function extractList<T = Record<string, unknown>>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'applications', 'products', 'riders', 'beneficiaries', 'history']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  throw new Error(`Expected a list in response body but got: ${JSON.stringify(body).slice(0, 200)}`);
}

export function normalizeStatus(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

/** Does a status text (UI or API) express the expected status, e.g. "Submitted"? */
export function statusMatches(actual: string | null | undefined, expected: string | null | undefined): boolean {
  const a = normalizeStatus(actual);
  const e = normalizeStatus(expected);
  return !!e && (a === e || a.includes(e) || e.includes(a));
}

/** Deep-search an object for the first value whose key matches the pattern. */
export function findDeep(obj: unknown, keyPattern: RegExp): unknown {
  if (obj === null || typeof obj !== 'object') return undefined;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (keyPattern.test(key) && value !== null && typeof value !== 'object') return value;
    const nested = findDeep(value, keyPattern);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

/** Validation-error responses should be 4xx and carry a structured error body. */
export function expectClientError(status: number, message = 'expected a 4xx validation response'): void {
  expect(status, message).toBeGreaterThanOrEqual(400);
  expect(status, message).toBeLessThan(500);
}

export function expectErrorStructure(body: unknown): void {
  expect(body, 'error body should be an object').toBeTruthy();
  expect(typeof body).toBe('object');
  const keys = Object.keys(body as Record<string, unknown>).join(',').toLowerCase();
  expect(keys, 'error body should expose an error/message/errors/details field').toMatch(/error|message|detail|violation|field/);
}
