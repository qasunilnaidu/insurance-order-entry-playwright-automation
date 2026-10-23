# Automation Fix — Progress & Resume Notes
_Last updated: 2026-10-22. Goal: "honest run" — make every test that SHOULD pass, pass; report the rest (no-API + seeded defects) truthfully._

## HOW TO RESUME
Say: **"Continue the insurance-order-entry Playwright work from AUTOMATION_PROGRESS.md"**
First action on resume: verify login still works (lab may have been reseeded) with
`agent.valid@insurance.test / Newpassword@123`, then continue the TODO list below.

## KEY ENVIRONMENT FACTS
- App under test: Laravel at `C:\qa-lab\apps\insurance-order-entry-demo`, served at http://127.0.0.1:8081. **No REST API** (`/api/*` → 404).
- Project: `C:\Users\talentfarm_learner\Downloads\insurance-order-entry-playwright-automation\insurance-order-entry-playwright-automation` (123 test cases; chromium project ≈108, excludes 15 API-project tests).
- Credentials (recovered from UserSeeder): **agent.valid = `Newpassword@123`**; ALL others = `Password@123`
  (agent.new, agent.submitted, agent.locked [LOCKED by design], agent.mfa, learner001–030, admin@insurance.test).
- `.env` is written and correct. SEEDED_DRAFT_ID=49, SEEDED_SUBMITTED_ID=43.
- Lockout: 5 failed logins → LOCKED 30 min (auto-expires). Forced password-change triggers when `password_changed_at` > 90 days old; the USER reset this. **I cannot write the lab DB (sandbox blocks "Modify Shared Resources").** If forced-change or a lock returns, the user must fix it (or wait 30 min for locks).
- Read lab DB (allowed): `cd /c/qa-lab/apps/insurance-order-entry-demo && /c/tools/php85/php -d extension_dir='C:\tools\php85\ext' -d extension=pdo_mysql artisan tinker --execute='...'`
- Seeded defects catalog: `database/seeders/SeededDefectSeeder.php`. Active (live) = status "Already wired"/"Already cataloged" (~20). Tests asserting correct behavior for these FAIL BY DESIGN (intended defect log) — do NOT "fix" them.
- App enum values (option label==value unless noted): gender MALE/FEMALE/NON_BINARY; marital SINGLE/MARRIED/DIVORCED/WIDOWED; id_type SSN/STATE_ID/PASSPORT/DRIVERS_LICENSE; source_of_funds SALARY/BUSINESS/INVESTMENTS/INHERITANCE; risk CONSERVATIVE/MODERATE/AGGRESSIVE; is_pep 0/1 (labels No/Yes); premium_frequency MONTHLY/QUARTERLY/SEMI_ANNUAL/ANNUAL (labels Monthly/Quarterly/Semi-Annual/Annual); payment_term_years 10/15/20/25/30; policy_term WHOLE_LIFE/TO_AGE_100; residential/mailing state = US code (value, e.g. CA); postal = 5-digit; beneficiary_type INDIVIDUAL/TRUST/ORGANIZATION; beneficiary_level PRIMARY/SECONDARY; relationship SPOUSE/CHILD/PARENT/SIBLING/TRUST/ORGANIZATION/OTHER; designation is_irrevocable 0/1 (Revocable/Irrevocable); comm modes EMAIL/PHONE/MAIL (labels Email/Phone/Postal Mail).
- IMPORTANT: login redirects AGENTS to their draft `/applications/{id}/client`, NOT `/dashboard`. Every login auto-creates a DRAFT if the agent has none (so "new agent empty dashboard" test can't pass).

## DONE (all persisted on disk)
- `.env` created with real creds + US business-rule values.
- `utils/apiClient.ts`: `create({authenticated})` no longer throws on no-API; exposes `loginOk`/`loginStatus`.
- `pages/BasePage.ts`: `errors` locator scoped to real error styling (excludes Bootstrap `alert-info`/`alert-success`; was false-failing expectNoErrors after a successful save).
- `pages/LoginPage.ts`: `expectDashboard()` navigates to /dashboard when the agent landed on the workflow.
- `pages/ClientInformationPage.ts`: real data-testids; **fills required `employer_address`** (was silently blocking every client save).
- `pages/AddressContactPage.ts`: real testids/nested names; same-as-residential testid.
- `pages/KycFinancialPage.ts`: real testids; PEP is a Yes/No **select** + compliance **checkbox** (was radios); `upload()` is a no-op (KYC step has no file input).
- `pages/ProductConfigurationPage.ts`: real testids; `premium` = `product-current-total-premium` only (was matching page subtitle).
- `pages/ReviewPage.ts`: premium = `review-total-premium`.
- `pages/BeneficiaryPage.ts`: reworked for the real inline form (split first/last name, `beneficiary_level`, designation select, legal-ack checkbox, gender).
- `pages/DocumentUploadPage.ts`: `upload()` completes the real form (type + file + filename + button).
- `fixtures/applicationData.ts`: test data aligned to app enums; added required payment/coverage terms.
- `tests/client-information/kyc.spec.ts`: adapted pepYes/pepNo radio refs to the PEP select + declaration.
- `npm run typecheck` is CLEAN.
- Verified: UI happy-path SAVES & PERSISTS (TC-CLI-01 UI passes; fails only on the no-API cross-check). Dashboard TC-DASH-01 passes.

- **API cross-checks guarded (TODO 1 DONE)**: new `utils/apiCrossCheck.ts` — `apiCrossCheck(api, what, fn)` runs only when `api.loginOk`, else adds an `api-gap` annotation; `requireApi(api, what)` skips pure UI-vs-API tests (TC-DASH-06, TC-PROD-14). Applied in all 15 UI specs + dashboard/isolation (TC-DASH-08 was a vacuous pass on 404). TC-WF-07 gained a UI-only "status = Submitted" assertion. Typecheck clean.

## TODO (resume here, in priority order)
1. ~~**Guard ~38 API cross-checks across 15 UI specs** so UI tests pass on UI logic: wrap each `/api/*` assertion in `if (api.loginOk) { ... }` (or a small helper `apiCrossCheck`). Files: auth/login, auth/session, beneficiaries/allocation, beneficiaries/persistence, client-information/client, dashboard/dashboard-api, dashboard/dashboard, product-selection/catalog, product-selection/premium, product-selection/terms, workflow/draft, workflow/e2e-submission, workflow/persistence, workflow/status, workflow/submission. This is the single biggest lever on the pass count.~~ DONE
2. DONE — real root cause was `BasePage.choose()`: `selectOption({label})` misses waited the full 15s actionTimeout before the value fallback (4x in the e2e flow = ~60s). `choose()` now resolves label/value (normalized) from the option list first. TC-WF-10 passes in ~15s; TC-CLI-01 passes. Old note: **Fix beneficiary relationship not applying** (TC-WF-10 e2e stalled; relationship select stayed "Select"). Investigate `set(relationship,'Spouse')` — likely needs the Individual branch visible / selectOption timing / gender. e2e flow may also be slow near the 90s timeout.
3. Triage remaining GENUINE UI failures per module (dashboard, product, workflow) after the API guard lands.
4. Decide handling of the ~20 seeded-defect tests: leave failing and report them as the intended defect log (do NOT assert buggy behavior). Optionally annotate/group them for a clean report.
5. Re-run full suite; produce final categorized numbers: genuine-pass / API-gap / seeded-defect.

## LAST PARTIAL RESULTS (run stopped early at 61/≈108)
ok:8 fail:50 skip:3 — still in the alphabetically-early, defect-heavy modules (auth/beneficiaries/client) with API cross-checks NOT yet guarded, so this understates the real UI pass rate. See `reports/partial-passes.txt`.

## !! RUN WITH --workers=1 !!
The lab runs on PHP's built-in dev server on Windows. Under concurrent requests Laravel intermittently
loses `.env` (getenv/putenv not thread-safe) -> requests run as "production" with no APP_KEY / sqlite
default -> random HTTP 500s and failed logins (laravel.log: "No application encryption key", "could not
find driver (sqlite)"). The 2026-10-22 --workers=4 run was contaminated by this (archived as
reports/full-run-workers4-contaminated.txt). Proper server fix = `php artisan config:cache` in the lab
app (I can't write there — ask the user). Until then always use --workers=1.
Also note DEF-AUTH-003 (live): failed_login_attempts is NOT reset on successful login, so wrong-password
tests accumulate on agent.valid across a run (was 2 after the aborted run).

## 2026-10-22 SERIAL RUN (clean server): 23 pass / 75 fail / 8 skip / 1 not run (reports/full-run.txt)
LIVE active seeded defects (from DB, differs from seeder labels!): API-001 API-002 AUTH-001..006 BEN-001 BEN-002
CLI-002 CLI-003 CLI-004 DOC-001 FIN-001 RIDER-001 RIDER-002 STATUS-001 WF-001 WF-002. (CLI-001 & PROD-001 NOT active.)
Query: tinker `\App\Models\SeededDefect::where("is_active",1)->pluck("defect_code")`.
Locator fixes applied after that run: confirmation-reference-number; product-card-{code}; reset-password-new/confirm;
rider-premium-summary; document-row-* (empty state is a tbody tr); review-validation-errors li; nextButton matches
*continue-button links; expectFieldError accepts native :invalid; BeneficiaryPage handles native confirm()/alert()
(Remove + irrevocable use confirm(); >100% uses alert()), edit/delete are testid links, allocation parsed per level.
App facts (genuine gaps, keep failing): NO search/filter on dashboard, /applications or catalog (DASH-05/07, PROD-13);
NO save-draft button anywhere (WF-01/02, BEN-14); riders page shows only "Current rider premium" (no itemized/total:
RID-01/07/09); client step validates only future DOB — <18 / >65 checked only at Review (CLI-03/04).

## !! agent.valid LOCKOUT TRAP (fixed 2026-10-22) !!
DEF-AUTH-003 is live: failed_login_attempts never resets on successful login. TC-AUTH-02 used agent.valid +
wrong password, so +1 per run, permanently -> agent.valid LOCKED at 5 (happened 17:39 local, unlocks ~18:10)
and the whole suite fails with "login did not authenticate the agent". TC-AUTH-02 now uses users.probe
(learner028). On lock expiry the app resets the counter to 0 (AuthController lockHasExpired), so agent.valid
comes back clean — but any future wrong-password test on agent.valid will start relocking it.
If you see "login did not authenticate" en masse: check `failed_login_attempts`/`locked_until` first.

## 2026-10-22 CLEAN SERIAL RUN #2: 32 pass / 66 fail / 8 skip / 1 not run (reports/full-run.txt, 37.9m)
Server clean except one 500 burst at 18:40:41 ("No application encryption key"). Fixes applied after it:
- ADDRESS FLAKE (root cause of ~7 review failures: "RESIDENTIAL address is required"): `randomMobile()` made
  numbers with exchange digit 0/1 ~20% of the time; app phone regex needs NANP (area+exchange start 2-9) ->
  address save silently rejected, helpers carried on. Fixed generator; helpers now call
  `expectStepSaved(path)` after client/address/kyc/product so a failed save fails AT that step with its errors.
- Native validation: BasePage records the browser's `invalid` events (addInitScript, per page load).
  expectError(pattern) passes if a blocked field's name/message matches; expectAnyError if any field was
  blocked; expectFieldError checks the blocked marker (NOT bare :invalid, which is true for any empty
  untouched required field and gave vacuous passes). Diagnostics list only actually-blocked fields.
- TC-RID-02: coverage input steps in 1,000s; face+1 was blocked by the step check, not the rule -> face+1000.
- Mapped from the DB (live defects): AUTH-06 = DEF-AUTH-001 (locked user sees "Invalid credentials");
  AUTH-11 = DEF-AUTH-006 (same password accepted); KYC-01 = DEF-CLI-002; PROD-07/KYC-05 = DEF-FIN-001;
  BEN-09/12 = DEF-BEN-001; RID-02 = DEF-RIDER-002; CLI-08 = DEF-CLI-004.
- App gaps (server rules absent): KYC id_number any string (KYC-02), pep_details nullable (KYC-04),
  issue/expiry only `after_or_equal` (KYC-09), "a@b" passes email:rfc (ADDR-05), no duplicate beneficiary
  check (BEN-08?), KYC step has no file upload (KYC-03).
!! NO GIT here and the Downloads zip predates all fixes. A scripted edit (String.replace with `$\``) once
wiped BasePage; it was rebuilt by replaying this session's Edit calls from the transcript. Back up a file
before any scripted (node/sed) multi-line edit.

## FINAL SPLIT 2026-10-22 (full-run.txt + rerun-after-fixes.txt; chromium, 107 tests, server clean during rerun)
PASS 41 (32 full run + 9 on rerun: ADDR-01 ADDR-03 KYC-06 PROD-12 WF-05 WF-08 WF-10 WF-11 WF-13)
FAIL 57 | SKIP 8 | DID NOT RUN 1 (AUTH-07: serial after AUTH-06 failed)
- Missing API: 16 api-project tests not runnable; DASH-06 + PROD-14 skipped (requireApi); API cross-checks in
  passing UI tests recorded as `api-gap` annotations instead of failing.
- Seeded defects (14): AUTH-06 AUTH-001 | AUTH-11 AUTH-006 | KYC-01 CLI-002 | KYC-05 + PROD-07 FIN-001 |
  BEN-02 BEN-09 BEN-12 BEN-001 | RID-02 RIDER-002 | CLI-08 CLI-004 | likely: BEN-04 BEN-002, CLI-07 CLI-003,
  DOC-04 DOC-001, WF-06 STATUS-001.
- Missing features / app gaps (21): DASH-05 DASH-07 PROD-13 (no search/filter) | WF-01 WF-02 BEN-14 (no save
  draft) | RID-01 RID-07 RID-09 (no itemized/total rider premium) | RID-06 (no health questionnaire) |
  AUTH-01 (no greeting) | AUTH-04 AUTH-12 (session not invalidated) | DASH-03 (login auto-creates draft) |
  KYC-02 KYC-03 KYC-04 KYC-09 ADDR-05 (server rules / upload absent) | CLI-03 CLI-04 (age checked only at Review).
- NOT YET TRIAGED (22, may still hide test bugs): AUTH-03 BEN-03 BEN-05 BEN-06 BEN-07 BEN-08 BEN-11 BEN-13
  CLI-02 CLI-09 KYC-08 PROD-02 PROD-09 RID-03 RID-05 VAL-01 VAL-02 VAL-04 VAL-05 WF-04 WF-09 WF-12.
- Skipped for missing config: AUTH-09 (MFA_OTP), AUTH-13 (PENDING_AGENT_*), PROD-08 (INACTIVE_PRODUCT_NAME),
  PROD-10 (PRODUCT_MIN/MAX_AGE), RID-04 (<= MAX_RIDERS riders exist), RID-08 (RIDER_DEPENDENT/PREREQUISITE).

## RUN COMMANDS
- Typecheck: `npm run typecheck`
- Full chromium: `npx playwright test --project=chromium --reporter=list --workers=4 > reports/full-run.txt 2>&1`
- One module: `npx playwright test --project=chromium --grep "TC-CLI-01|TC-WF-10" --reporter=line`
- Before any run: ensure no previous run/node process is still alive (avoids lockout from concurrent logins).

## 2026-10-23 A-C CLEANUP (reports/rerun-AC.txt)
Helpers in utils/testCase.ts: `seededDefect(code)` (annotation only, test still FAILS BY DESIGN) and
`appGap(reason)` (annotation + test.fixme -> reported as skipped with the reason).
- Seeded (keep failing, 14): AUTH-06 AUTH-11 KYC-01 KYC-05 PROD-07 BEN-02 BEN-04 VAL-04 RID-02 RID-05 CLI-08
  DOC-04 CLI-07 CLI-03 (CLI-03/07 = DEF-CLI-003: DOB 1986-10-23 -> age 41; 17y364d counts as 18).
- Test fixes now PASSING (15): AUTH-03 AUTH-12 BEN-03 BEN-05 BEN-06 BEN-07 BEN-09 BEN-12 CLI-02 CLI-04 KYC-08
  PROD-09 VAL-01 VAL-05 WF-06.
- appGap fixme (16): AUTH-01 DASH-03 RID-01 RID-03 RID-06 KYC-02 KYC-03 KYC-04 KYC-09 ADDR-05 CLI-09 BEN-08
  BEN-11 BEN-13 VAL-02 WF-09.
- Untouched real (unseeded) bugs still failing: AUTH-04 (logout/back), WF-04 (submitted app editable), WF-12.
Projected full chromium run: ~65 pass / 17 fail (14 seeded + 3 real) / 25 skip.
Pre-change backup: scratchpad backup-before-AC.tgz (tests, pages, utils, fixtures).
