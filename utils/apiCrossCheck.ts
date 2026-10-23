import { test } from '@playwright/test';
import { ApiClient } from './apiClient';

function gapNote(api: ApiClient, what: string): string {
  return `${what} not verified: the app exposes no REST API (POST /api/auth/login -> ${api.loginStatus})`;
}

/**
 * Runs an optional backend cross-check only when the API client could log in.
 * The app under test has no REST API (all /api/* routes 404), so UI tests are judged on UI
 * behaviour and the skipped check is recorded as an `api-gap` annotation in the report
 * instead of failing (or, worse, passing because a 404 happened to match).
 */
export async function apiCrossCheck(api: ApiClient, what: string, check: () => Promise<void>): Promise<void> {
  if (!api.loginOk) {
    test.info().annotations.push({ type: 'api-gap', description: gapNote(api, what) });
    return;
  }
  await check();
}

/** For tests whose whole purpose is a UI-vs-API comparison: skip (with the reason) when there is no API. */
export function requireApi(api: ApiClient, what: string): void {
  test.skip(!api.loginOk, `api-gap: ${gapNote(api, what)}`);
}
