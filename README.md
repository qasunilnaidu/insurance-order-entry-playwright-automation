# Insurance Order Entry - Playwright QA Automation (Submission 2)

Playwright + TypeScript automation for the Whole Life insurance order entry platform, **built from the
Submission 2 Test Case Design Sheet**: all **123 test cases** are automated, one script per sheet row.

- Every test is titled `TC-<MODULE>-<NN> [<VALIDATION-ID>] <title>` exactly as in the sheet, and carries the sheet's
  tags, build wave, priority and severity (`fixtures/testCases.json`, generated from the sheet).
- Each script is in the spec file the sheet plans (`Planned Spec File` column).
- `npm run check:traceability` proves 123/123 sheet cases are present, once each, in the planned file.
- Sheet with Automation Status = Automated: `docs/Submission2_Test_Case_Design_Sheet_Automated.xlsx`

## Quick start (VS Code)

```bash
npm install
npx playwright install chromium
cp .env.example .env        # Windows: copy .env.example .env
npm run test:smoke          # then: npm run report
```

Fill in `.env` using the sheet's **Test Data** sheet names (VALID_AGENT_USER/PASS, SECOND_AGENT_*, NEW_AGENT_*,
LOCKED_AGENT_*, LOCKOUT_TEST_AGENT_*, MFA_AGENT_*/MFA_OTP, PENDING_AGENT_*, RESET_AGENT_*/RESET_OTP,
SEEDED_DRAFT_ID, SEEDED_SUBMITTED_ID, MIN/MAX_FACE_VALUE, MAX_UPLOAD_MB, ...).

## Running by sheet column

| Command | Runs |
|---|---|
| `npm test` | All 123 tests (UI + API) |
| `npm run test:wave1` / `wave2` / `wave3` | Build Waves from the sheet |
| `npm run test:short` | Short-Cohort Set (34 cases) |
| `npm run test:critical` | Severity = Critical |
| `npm run test:smoke` / `regression` / `e2e` | By tag |
| `npm run test:auth` / `dashboard` / `client` / `address` / `kyc` / `product` / `rider` / `beneficiary` / `documents` / `workflow` | One module |
| `npm run test:api` / `test:ui` | API project / browser project |
| `npm run test:lockout` | Account-lockout tests, serial, one worker (they lock an account) |
| `npm run test:xbrowser` | Firefox + WebKit smoke (set `BROWSERS=chromium,firefox,webkit`) |
| `npm run test:list`, `typecheck`, `report` | List / type-check / open report |

## Sheet columns honoured

- **Backend Cross-check**: tests with an API/DB note call the API after the UI step (e.g. TC-BEN-02, TC-PROD-14, TC-WF-03).
- **"Also verify: rejected value is not saved"**: `expectValueNotSaved` reloads the page and checks the rejected value is gone.
- **Isolation / Cleanup**: every test builds its own application with unique generated data; tests that change
  state shared with others (password reset) restore it afterwards.

## Design notes

- **Page Object Model**: no selectors in tests. `BasePage` centralizes locator strategy:
  `data-testid` / `name` / `id` first, then `getByLabel` / `getByRole`. No XPath, no hard-coded waits.
- **Fixtures**: `agent` (already logged in), `pages` (unauthenticated), `api` (authenticated API client), `anonymousApi`.
- **Business flow helpers** (`utils/testHelpers.ts`) build an application up to any step, so each test is independent.
- **Evidence**: screenshots, video and trace are kept on failure (`playwright.config.ts`). Open a trace with
  `npx playwright show-trace <trace.zip>`.
- **Tags**: `@smoke`, `@regression`, `@e2e`, `@api`, `@auth`, `@dashboard`, `@client`, `@address`, `@kyc`,
  `@product`, `@rider`, `@beneficiary`, `@documents`, `@validation`, `@workflow`, `@security`, `@compliance`.
- **CI/CD**: GitHub Actions - install, type-check, smoke, regression (PR / nightly / manual / external dispatch),
  artifact upload, and a release gate that fails when critical tests fail.

## Coverage

123 cases: Auth 13, Dashboard 9, Client 9, Address/Contact 7, KYC 9, Product 14, Riders 9, Beneficiaries 14,
Documents 5, Validation 5, Workflow 13, API 15, cross-browser 1 (see the sheet's Coverage Summary).

## Open Items (confirm with the programme)

The sheet lists 20 Open Items - exact limits, formats and rules not yet confirmed. Tests that depend on them read
the value from `.env` and **skip** when it is not set: `PRODUCT_MIN_AGE/MAX_AGE`, `RIDER_DEPENDENT/PREREQUISITE`,
`INACTIVE_PRODUCT_NAME`, `MAX_RIDERS`, `RIDER_INELIGIBLE_AGE`, `LOW_ANNUAL_INCOME`, `ZIP_STATE_MISMATCH_RULE`
(block | allow), `SECOND_AGENT_*`. API payload field names live in `utils/apiPayloads.ts`.

## IMPORTANT - align locators with the real application

The framework was written from the problem statement, route list and validation tables; it has **not** been run
against the lab application. Before you submit:

1. Run `npm run test:smoke` and open `npm run report`.
2. Where a locator fails, fix it **once** in `pages/*.ts` (or `BasePage.ts`). Use Playwright's codegen to find
   good locators: `npx playwright codegen http://127.0.0.1:8081`.
3. Check API paths/payloads in `tests/api/*.spec.ts`, `utils/apiPayloads.ts` and `utils/apiClient.ts` against the API specification
   (login body fields, create-application endpoint, response envelopes).
4. Fill in `.env` values that depend on your cohort's data: product name, face value limits, rider names, max rider count.
5. Some tests `skip` themselves when optional data is missing (e.g. no second agent configured).
6. Tests that assert seeded defects will fail on purpose - those failures are your Submission 3 defect log.

## Submission checklist

- [ ] Push to a Git repository (or zip the project without `node_modules`)
- [ ] `docs/Submission2_Test_Case_Design_Sheet_Automated.xlsx` attached
- [ ] README present (this file)
- [ ] `playwright.config.ts`, `package.json`, `tsconfig.json`, `.github/workflows/playwright.yml` included
- [ ] Sample execution output: run `npx playwright test --reporter=list > reports/sample-execution-output.txt`
- [ ] Never commit `.env` (credentials are distributed offline)
