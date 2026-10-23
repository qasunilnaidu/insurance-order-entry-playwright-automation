import { dobYearsAgo, futureDate } from '../utils/dataGenerator';

/**
 * Controlled datasets from the "Test Data" sheet.
 * Boundary DOBs are computed at run time (relative to today), never hard-coded.
 */
export const dobs = {
  /** 17 years 364 days -> rejected (below 18) */
  underage: dobYearsAgo(18, 1),
  /** exactly 18 years -> accepted (inclusive, CONFIRM) */
  exactly18: dobYearsAgo(18),
  /** typical adult, 40 years */
  adult40: dobYearsAgo(40),
  /** 39 years 364 days (birthday later this year/tomorrow) */
  almost40: dobYearsAgo(40, 1),
  /** exactly 65 years -> accepted (inclusive, CONFIRM) */
  exactly65: dobYearsAgo(65),
  /** 65 years + 1 day -> rejected (above 65) */
  over65: dobYearsAgo(65, -1),
  /** tomorrow -> rejected */
  tomorrow: futureDate(1),
  /** a minor beneficiary (17y 364d) */
  minor: dobYearsAgo(18, 1),
  /** a clearly young child, for guardian rules */
  child: dobYearsAgo(10),
};

/** Malformed DOB values from TC-CLI-09 (dd-mm-yyyy as in the sheet). */
export const malformedDobs = ['31-02-1990', '00-00-0000', 'abc', '01-01-1850'];

export const invalidNames = ['J0hn#', '12345', '   '];

export const invalidZips = ['ABCDE', '123', '1234567', ''];

export const invalidEmails = ['abc', 'a@b', 'a@@b.com', 'a b@c.com'];

/** Last value is an 11-digit number (CONFIRM format against the app). */
export const invalidPhones = ['12345', 'abcdefghij', '+', '12345678901'];

export const invalidFaceValues = ['0', '-1000', 'abc', '100000.55', ''];

export const invalidAllocations = ['0', '-10', 'abc', '33.333', '100.01'];

export const invalidFinancials = ['', '-1', 'abc'];

/** Allocation datasets */
export const allocations = {
  exact: { primary: [100], secondary: [100] },
  under: { primary: [99] },
  over: { primary: [60, 41] },
  split6040: { primary: [60, 40] },
  secondaryShort: { primary: [100], secondary: [90] },
};

/** Synthetic SSN (fake). */
export const SYNTHETIC_SSN = '123-45-6789';

/** Correct ID number format per ID type (extend after confirming the types - Open Items #8). */
export const validIdNumbers: Record<string, string> = {
  passport: 'N1234567',
  ssn: SYNTHETIC_SSN,
  'driver license': 'D1234567',
  "driver's license": 'D1234567',
  'national id': '123456789012',
  aadhaar: '123456789012',
  pan: 'ABCDE1234F',
};

export const WRONG_ID_NUMBER = '!!';

export const PEP_DETAILS = 'Former member of a local government advisory board (test data).';

/** Date helpers for ID issue/expiry tests (TC-KYC-09). */
export const idDates = {
  pastExpiry: { issue: dobYearsAgo(5), expiry: dobYearsAgo(0, -30) },
  validIssue: dobYearsAgo(1),
  validExpiry: futureDate(365 * 5),
  futureIssue: futureDate(30),
  futureIssueExpiry: futureDate(365 * 6),
  expiryBeforeIssue: { issue: dobYearsAgo(1), expiry: dobYearsAgo(2) },
};
