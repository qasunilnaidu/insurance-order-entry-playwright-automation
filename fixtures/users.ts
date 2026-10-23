import { env } from '../utils/env';

export interface UserCredentials {
  username: string;
  password: string;
}

/**
 * Seeded agents. Real values come from .env (never committed).
 * - valid:    active agent with draft/submitted/approved applications
 * - second:   another active agent (data-isolation checks)
 * - newAgent: active agent with no applications (empty dashboard)
 * - locked:   agent whose account is locked (read-only)
 * - lockout:  agent RESERVED for the 5-failed-attempts test (needs an admin unlock afterwards)
 * - mfa:      agent that requires an OTP
 * - pending:  agent not yet approved
 * - reset:    disposable agent for password reset / change tests
 * - probe:    disposable existing agent used for "real user + wrong password" checks. Never use
 *             `valid` for that: seeded defect DEF-AUTH-003 keeps the failed-login counter across
 *             successful logins, so every run would edge the shared agent towards a 30-min lockout.
 * - invalid:  credentials that do not exist (email-shaped: the login field is type="email")
 */
export const users: Record<
  'valid' | 'second' | 'newAgent' | 'locked' | 'lockout' | 'mfa' | 'pending' | 'reset' | 'probe' | 'invalid',
  UserCredentials
> = {
  valid: { username: env.validUser, password: env.validPass },
  second: { username: env.secondUser, password: env.secondPass },
  newAgent: { username: env.newUser, password: env.newPass },
  locked: { username: env.lockedUser, password: env.lockedPass },
  lockout: { username: env.lockoutUser, password: env.lockoutPass },
  mfa: { username: env.mfaUser, password: env.mfaPass },
  pending: { username: env.pendingUser, password: env.pendingPass },
  reset: { username: env.resetUser, password: env.resetPass },
  probe: { username: env.probeUser, password: '' },
  invalid: { username: 'no.such.user@insurance.test', password: 'Wrong#Pass1' },
};

export const WRONG_PASSWORD = 'Wrong#Pass1';

/** Weak password set from TC-AUTH-08 (short, common word, no special char, no digit). */
export const WEAK_PASSWORDS = ['abc', 'password', '12345678', 'Abcdefgh'];

/** A password that satisfies the usual policy; CONFIRM against the real rules (Open Items #4). */
export const STRONG_PASSWORD = 'Qa#Reset2026!x';

export const isConfigured = (user: UserCredentials): boolean => !!user.username && !!user.password;
