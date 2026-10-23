import { defineConfig, devices } from '@playwright/test';
import { env } from './utils/env';

const browserDevices = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
} as const;

type BrowserName = keyof typeof browserDevices;

const requested = env.browsers.filter((b): b is BrowserName => b in browserDevices);

/**
 * chromium runs the whole UI suite. Firefox / WebKit (TC-XC-01, risk QR-13) only run the
 * @smoke auth + dashboard tests, and only when BROWSERS includes them, e.g.
 *   BROWSERS=chromium,firefox,webkit npx playwright test --project=firefox --project=webkit
 */
const uiProjects = requested.map((name) =>
  name === 'chromium'
    ? { name, testIgnore: /tests\/api\/.*/, use: { ...browserDevices[name] } }
    : {
        name,
        testMatch: /tests\/(auth|dashboard)\/.*\.spec\.ts/,
        grep: /@smoke/,
        use: { ...browserDevices[name] },
      },
);

export default defineConfig({
  testDir: './tests',
  outputDir: './reports/test-results',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: env.isCI,
  retries: env.isCI ? 2 : 0,
  workers: env.isCI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
  ],

  use: {
    baseURL: env.baseUrl,
    // Evidence capture for every failure (screenshots, trace viewer, video)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    ...uiProjects,
    {
      name: 'api',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: { baseURL: env.apiBaseUrl },
    },
  ],
});
