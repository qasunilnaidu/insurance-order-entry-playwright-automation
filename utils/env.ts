import * as dotenv from 'dotenv';

dotenv.config();

/** First non-empty value among the given variable names (lets old and new names both work). */
const pick = (...names: string[]): string => {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== '') return value;
  }
  return '';
};

const num = (fallback: number, ...names: string[]): number => {
  const raw = pick(...names);
  const parsed = Number(raw);
  return raw !== '' && Number.isFinite(parsed) ? parsed : fallback;
};

const baseUrl = pick('BASE_URL') || 'http://127.0.0.1:8081';

/** API root without a trailing "/api" - test paths already start with /api/... */
const apiBase = (pick('API_BASE_URL') || baseUrl).replace(/\/+$/, '').replace(/\/api$/i, '');

/**
 * Single place where all environment-driven configuration is read.
 * Variable names follow the "Test Data" sheet of the design workbook.
 * Nothing sensitive is hard-coded: credentials come from .env / CI secrets.
 */
export const env = {
  baseUrl,
  apiBaseUrl: apiBase,
  appName: pick('APP_NAME') || 'insurance',

  // Seeded agents (Test Data sheet)
  validUser: pick('VALID_AGENT_USER', 'AGENT_USERNAME'),
  validPass: pick('VALID_AGENT_PASS', 'AGENT_PASSWORD'),
  secondUser: pick('SECOND_AGENT_USER', 'AGENT2_USERNAME'),
  secondPass: pick('SECOND_AGENT_PASS', 'AGENT2_PASSWORD'),
  newUser: pick('NEW_AGENT_USER', 'NEW_AGENT_USERNAME'),
  newPass: pick('NEW_AGENT_PASS', 'NEW_AGENT_PASSWORD'),
  lockedUser: pick('LOCKED_AGENT_USER', 'LOCKED_AGENT_USERNAME'),
  lockedPass: pick('LOCKED_AGENT_PASS', 'LOCKED_AGENT_PASSWORD'),
  lockoutUser: pick('LOCKOUT_TEST_AGENT_USER'),
  lockoutPass: pick('LOCKOUT_TEST_AGENT_PASS'),
  mfaUser: pick('MFA_AGENT_USER'),
  mfaPass: pick('MFA_AGENT_PASS'),
  mfaOtp: pick('MFA_OTP'),
  pendingUser: pick('PENDING_AGENT_USER'),
  pendingPass: pick('PENDING_AGENT_PASS'),
  probeUser: pick('WRONG_PASSWORD_PROBE_USER') || 'learner028@insurance.test',
  resetUser: pick('RESET_AGENT_USER'),
  resetPass: pick('RESET_AGENT_PASS'),
  resetOtp: pick('RESET_OTP', 'MFA_OTP'),
  /** The demo app writes generated reset OTPs to its Laravel log; used when RESET_OTP is empty. */
  appLogPath: pick('APP_LOG_PATH') || 'C:\\qa-lab\\apps\\insurance-order-entry-demo\\storage\\logs\\laravel.log',

  seededDraftId: pick('SEEDED_DRAFT_ID'),
  seededSubmittedId: pick('SEEDED_SUBMITTED_ID'),

  // Product / business rule values to CONFIRM in the running app (Open Items sheet)
  productName: pick('PRODUCT_NAME'),
  expectedProducts: pick('EXPECTED_PRODUCTS')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean),
  inactiveProduct: pick('INACTIVE_PRODUCT_NAME'),
  faceValueMin: num(25000, 'MIN_FACE_VALUE', 'FACE_VALUE_MIN'),
  faceValueMax: num(1000000, 'MAX_FACE_VALUE', 'FACE_VALUE_MAX'),
  productMinAge: num(0, 'PRODUCT_MIN_AGE'),
  productMaxAge: num(0, 'PRODUCT_MAX_AGE'),
  maxUploadMb: num(5, 'MAX_UPLOAD_MB'),
  maxRiders: num(3, 'MAX_RIDERS'),
  riderIneligibleAge: num(64, 'RIDER_INELIGIBLE_AGE'),
  lowIncome: pick('LOW_ANNUAL_INCOME') || '100000',
  zipStateMismatchRule: pick('ZIP_STATE_MISMATCH_RULE').toLowerCase(), // block | allow | (empty = just record)
  sessionCookieName: pick('SESSION_COOKIE_NAME'),

  riderAdb: pick('RIDER_ADB') || 'Accidental Death Benefit',
  riderCriticalIllness: pick('RIDER_CRITICAL_ILLNESS') || 'Critical Illness',
  riderWaiver1: pick('RIDER_WAIVER_1') || 'Waiver of Premium',
  riderWaiver2: pick('RIDER_WAIVER_2') || 'Waiver of Premium - Disability',
  riderDependent: pick('RIDER_DEPENDENT'),
  riderPrerequisite: pick('RIDER_PREREQUISITE'),

  browsers: (pick('BROWSERS') || 'chromium')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean),
  isCI: !!process.env.CI,
};

/** Absolute URL for an API path, e.g. apiUrl('/api/applications'). */
export function apiUrl(path: string): string {
  return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
