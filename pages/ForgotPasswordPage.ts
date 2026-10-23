import { readFileSync, statSync } from 'fs';
import { expect, Locator } from '@playwright/test';
import { env } from '../utils/env';
import { BasePage } from './BasePage';

/**
 * /forgot-password reset flow: identify the agent -> (simulated) OTP -> choose a new password.
 * The steps adapt to the screens the build actually shows (OTP / confirm fields are optional).
 */
export class ForgotPasswordPage extends BasePage {
  readonly identifier: Locator = this.field('username', /user ?name|email/i);
  readonly otp: Locator = this.field('otp', /otp|verification code|one[- ]time/i);
  readonly newPassword: Locator = this.field('reset-password-new', /^new password|^password$/i);
  readonly confirmPassword: Locator = this.field('reset-password-confirm', /confirm (new )?password|re-?enter|repeat/i);

  async goto(): Promise<void> {
    await this.open('/forgot-password');
  }

  private async advance(name: RegExp, testId: string): Promise<void> {
    await this.button(name, testId).click();
  }

  async requestReset(identifier: string): Promise<void> {
    await this.identifier.fill(identifier);
    await this.advance(/send|request|continue|next|submit|reset/i, 'request-reset-button');
  }

  /** Latest "Demo password reset OTP generated" entry for this email in the app log. */
  private async otpFromLog(email: string, since: number): Promise<string> {
    let otp = '';
    await expect
      .poll(
        () => {
          const lines = readFileSync(env.appLogPath, 'utf8').slice(since).split('\n');
          const hit = lines.reverse().find((l) => l.includes('Demo password reset OTP generated') && l.includes(`"${email}"`));
          otp = hit?.match(/"otp":"(\d{4,8})"/)?.[1] ?? '';
          return otp;
        },
        { message: `reset OTP for ${email} in ${env.appLogPath}` },
      )
      .not.toBe('');
    return otp;
  }

  async enterOtpIfAsked(otp: string): Promise<void> {
    if (await this.otp.isVisible().catch(() => false)) {
      await this.otp.fill(otp);
      await this.advance(/verify|continue|next|submit|confirm/i, 'verify-otp-button');
    }
  }

  async submitNewPassword(password: string): Promise<void> {
    await this.newPassword.fill(password);
    if (await this.confirmPassword.isVisible().catch(() => false)) {
      await this.confirmPassword.fill(password);
    }
    await this.advance(/reset|change|update|submit|save/i, 'reset-password-button');
  }

  /** Full flow up to submitting the new password. */
  async resetPassword(identifier: string, otp: string, newPassword: string): Promise<void> {
    await this.goto();
    const logSize = otp ? 0 : statSync(env.appLogPath).size;
    await this.requestReset(identifier);
    await this.enterOtpIfAsked(otp || (await this.otpFromLog(identifier, logSize)));
    await this.submitNewPassword(newPassword);
  }

  async expectPolicyRejection(): Promise<void> {
    await this.expectError(/password|policy|weak|strong|characters|must|at least|complex/i);
  }
}
