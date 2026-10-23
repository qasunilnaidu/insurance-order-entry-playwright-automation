import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly username: Locator = this.field('username', /user ?name|email/i);
  readonly password: Locator = this.field('password', /^password$/i);
  readonly submit: Locator = this.button(/log ?in|sign ?in/i, 'login-button');
  readonly forgotPasswordLink: Locator = this.page.getByRole('link', { name: /forgot/i });
  readonly otp: Locator = this.field('otp', /otp|verification code|one[- ]time/i);
  readonly verifyOtpButton: Locator = this.button(/verify|submit|continue|confirm/i, 'verify-otp-button');

  async goto(): Promise<void> {
    await this.open('/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }

  async submitEmpty(): Promise<void> {
    await this.submit.click();
  }

  async expectDashboard(): Promise<void> {
    // Agents are routed into their in-progress application after login; the dashboard
    // is reachable once authenticated, so navigate there if we landed elsewhere.
    if (!/\/dashboard/.test(this.page.url())) {
      if (/\/login/.test(this.page.url())) {
        await expect(this.page, 'login did not authenticate the agent').not.toHaveURL(/\/login/);
      }
      await this.page.goto('/dashboard');
      await this.page.waitForLoadState('domcontentloaded');
    }
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/);
  }

  /** Both username and password must each show a field-level required error. */
  async expectBothFieldsRequired(): Promise<void> {
    // The login inputs carry the native `required` attribute: the browser blocks the submit and
    // flags each empty field itself, so no server-rendered message appears.
    if ((await this.blockedFields()).length) {
      await this.expectFieldError(this.username);
      await this.expectFieldError(this.password);
      return;
    }
    await expect(this.errors.first()).toBeVisible();
    await expect.poll(() => this.errors.count()).toBeGreaterThanOrEqual(2);
    await expect(this.errors.filter({ hasText: /required|mandatory|cannot be (blank|empty)|enter|provide/i }).first()).toBeVisible();
  }

  async enterOtp(code: string): Promise<void> {
    await this.otp.fill(code);
    await this.verifyOtpButton.click();
  }

  async logout(): Promise<void> {
    const logout = this.page
      .getByRole('button', { name: /log ?out|sign ?out/i })
      .or(this.page.getByRole('link', { name: /log ?out|sign ?out/i }))
      .or(this.page.getByRole('menuitem', { name: /log ?out|sign ?out/i }))
      .or(this.testId('logout-button'))
      .first();

    if (!(await logout.isVisible())) {
      // Logout is often nested in a user / profile menu
      await this.testId('user-menu')
        .or(this.page.getByRole('button', { name: /profile|account|user|menu/i }))
        .first()
        .click();
    }
    await logout.click();
  }

  /** Visible greeting / agent name after login. */
  get greeting(): Locator {
    return this.testId('user-greeting').or(this.page.getByText(/welcome|hello|good (morning|afternoon|evening)/i)).first();
  }
}
