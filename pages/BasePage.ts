import { expect, Locator, Page } from '@playwright/test';

/**
 * Shared behaviour for every page object.
 *
 * Locator strategy (most stable first):
 *   1. data-testid / name / id attribute matching `key`
 *   2. accessible label (getByLabel) / role (getByRole)
 * If the lab application uses different attributes, change them HERE once
 * instead of in every page object or test.
 */
/** Pages that already record native validation blocks (several page objects share one page). */
const trackedPages = new WeakSet<Page>();

/** A field the browser refused to submit (native `required` / min / pattern / step validation). */
interface BlockedField {
  name: string;
  message: string;
}

export abstract class BasePage {
  constructor(protected readonly page: Page) {
    if (!trackedPages.has(page)) {
      trackedPages.add(page);
      // The browser fires `invalid` on every failing control when it blocks a submit. Recording it
      // (per page load) tells a real "submit was blocked" apart from a merely empty, untouched form.
      void page
        .addInitScript(() => {
          const w = window as unknown as { __blockedFields?: { name: string; message: string }[] };
          w.__blockedFields = [];
          document.addEventListener(
            'invalid',
            (event) => {
              const el = event.target as HTMLInputElement;
              el.setAttribute('data-native-invalid', 'true');
              w.__blockedFields!.push({ name: el.name || el.id, message: el.validationMessage });
            },
            true,
          );
        })
        .catch(() => undefined);
    }
  }

  protected async open(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Form control located by data-testid / name / id, falling back to its label. */
  protected field(key: string, label: string | RegExp): Locator {
    return this.page
      .locator(`[data-testid="${key}"], [name="${key}"], [id="${key}"]`)
      .or(this.page.getByLabel(label))
      .first();
  }

  protected button(name: string | RegExp, testId?: string): Locator {
    const byRole = this.page.getByRole('button', { name });
    return (testId ? byRole.or(this.page.getByTestId(testId)) : byRole).first();
  }

  protected testId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  // ---------------------------------------------------------------- validation messages

  /** Visible validation / error messages (inline, summary or toast). */
  get errors(): Locator {
    // Real error styling only: Bootstrap alert-info / alert-success banners are not errors,
    // otherwise expectNoErrors() false-fails after a successful save.
    return this.page.locator(
      [
        '.alert-danger',
        '[role="alert"].alert-danger',
        '[data-testid$="-error"]',
        '[data-testid="validation-error-alert"]',
        '[data-testid="validation-summary"]',
        '[data-testid="review-validation-errors"]',
        '[data-testid="beneficiary-error-summary"]',
        '.error-message',
        '.field-error',
        '.invalid-feedback',
        '.text-danger',
        '.toast-error',
        '.Toastify__toast--error',
      ].join(', '),
    );
  }

  /**
   * Assert that at least one visible error matches the given text. A submit the browser itself blocked
   * on a matching field (native validation, e.g. face_value "Value must be greater than or equal to 1")
   * is the app rejecting the input too, so it counts.
   */
  async expectError(text: string | RegExp): Promise<void> {
    const pattern = typeof text === 'string' ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : text;
    const blocked = await this.blockedFields();
    if (blocked.some((f) => pattern.test(`${f.name.replace(/[_[\]]+/g, ' ')} ${f.message}`))) return;
    await expect(this.errors.filter({ hasText: text }).first(), this.errorContext(blocked)).toBeVisible();
  }

  async expectAnyError(): Promise<void> {
    const blocked = await this.blockedFields();
    if (blocked.length) return;
    await expect(this.errors.first(), this.errorContext(blocked)).toBeVisible();
  }

  /** Fields the browser blocked on a submit attempt since this page loaded (see constructor). */
  protected async blockedFields(): Promise<BlockedField[]> {
    return this.page
      .evaluate(() => (window as unknown as { __blockedFields?: BlockedField[] }).__blockedFields ?? [])
      .catch(() => [] as BlockedField[]);
  }

  /** Diagnostic for a missing error message. */
  private errorContext(blocked: BlockedField[]): string {
    const fields = blocked.map((f) => `${f.name}: ${f.message}`).join('; ');
    return `error message on ${this.page.url()}` + (fields ? ` (browser-blocked: ${fields})` : '');
  }

  async expectNoErrors(): Promise<void> {
    await expect(this.errors.first()).toBeHidden();
  }

  /** The control is flagged invalid (aria-invalid) or an error message sits next to it. */
  async expectFieldError(control: Locator): Promise<void> {
    await expect
      .poll(
        () =>
          control.evaluate((el) => {
            if (el.getAttribute('aria-invalid') === 'true') return true;
            // Native constraint validation: the browser blocked the submit on this control (see constructor).
            if (el.getAttribute('data-native-invalid') === 'true') return true;
            const selector =
              '[role="alert"], [data-testid$="-error"], .error, .error-message, .field-error, .invalid-feedback, .text-danger';
            let node: Element | null = el.parentElement;
            for (let depth = 0; node && depth < 2; depth += 1, node = node.parentElement) {
              if (node.querySelector(selector)) return true;
            }
            return false;
          }),
        { message: `field error on ${control}` },
      )
      .toBe(true);
  }

  async errorCount(): Promise<number> {
    return this.errors.count();
  }

  // ---------------------------------------------------------------- navigation buttons

  get nextButton(): Locator {
    // Some steps proceed through a link styled as a button (e.g. documents-continue-review-button).
    return this.button(/^(next|continue|save (&|and) continue|proceed)/i, 'next-button')
      .or(this.page.locator('[data-testid$="continue-button"], [data-testid$="continue-review-button"]'))
      .first();
  }

  get saveDraftButton(): Locator {
    return this.button(/save (as )?draft/i, 'save-draft-button');
  }

  async nextStep(): Promise<void> {
    await this.nextButton.click();
  }

  /** After nextStep() in a setup flow: the step saved and the app moved on; otherwise fail with what blocked it. */
  async expectStepSaved(stepPath: string): Promise<void> {
    try {
      await expect(this.page).not.toHaveURL(new RegExp(`${stepPath}/?(\\?.*)?$`));
    } catch {
      const shown = (await this.errors.allInnerTexts().catch(() => [] as string[])).map((t) => t.trim()).filter(Boolean);
      const errors = shown.length ? `; errors: ${shown.join(' | ')}` : '';
      throw new Error(`${stepPath} step did not save: ${this.errorContext(await this.blockedFields())}${errors}`);
    }
  }

  async saveDraft(): Promise<void> {
    await this.saveDraftButton.click();
  }

  async expectNextEnabled(): Promise<void> {
    await expect(this.nextButton).toBeEnabled();
  }

  /** Blocked means: the button is disabled, or an error appears after clicking. */
  async expectNextBlocked(): Promise<void> {
    if (await this.nextButton.isDisabled()) return;
    await this.nextButton.click();
    await this.expectAnyError();
  }

  /**
   * True when the UI refused the input: Next is disabled, an error is shown,
   * or the page did not move on. Used by the UI/API parity test.
   */
  async rejectsInput(): Promise<boolean> {
    if (await this.nextButton.isDisabled()) return true;
    const before = this.page.url();
    await this.nextButton.click();
    const moved = this.page
      .waitForURL((url) => url.toString() !== before, { timeout: 4000 })
      .then(() => false)
      .catch(() => true);
    const errored = this.errors
      .first()
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    return Promise.race([moved, errored]);
  }

  // ---------------------------------------------------------------- control helpers

  /** Works with native <select> elements and custom combobox/listbox widgets. */
  async choose(control: Locator, value: string): Promise<void> {
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      // Resolve label-or-value up front: a selectOption({ label }) miss waits the full action
      // timeout (15s) before any fallback runs, which alone pushed the e2e flows past 90s.
      const options = await control.locator('option').evaluateAll((els) =>
        els.map((o) => ({ value: (o as HTMLOptionElement).value, label: (o.textContent ?? '').trim() })),
      );
      const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
      const wanted = norm(value);
      const match =
        options.find((o) => o.label === value || o.value === value) ??
        options.find((o) => norm(o.label) === wanted || norm(o.value) === wanted);
      if (!match) {
        throw new Error(`No option "${value}" in select (options: ${options.map((o) => `${o.label}=${o.value}`).join(', ')})`);
      }
      await control.selectOption(match.value);
      return;
    }
    await control.click();
    await this.page.getByRole('option', { name: value }).first().click();
  }

  /** Fills text inputs and picks the right interaction for selects. */
  async set(control: Locator, value: string): Promise<void> {
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select' || (await control.getAttribute('role')) === 'combobox') {
      await this.choose(control, value);
    } else {
      await control.fill(value);
    }
  }

  /**
   * Types a value that may not be valid for the input type (e.g. "abc" into a number field,
   * "31-02-1990" into a date field). fill() refuses such text, so fall back to setting the raw
   * value and dispatching input/change events - the application's own validation must still react.
   */
  async typeRaw(control: Locator, value: string): Promise<void> {
    try {
      await control.fill(value, { timeout: 3000 });
    } catch {
      await control.evaluate((el, v) => {
        const input = el as HTMLInputElement;
        input.value = v;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    }
    await control.blur();
  }

  /** The value a user would see in a control (input value, selected option text or text content). */
  async displayValue(control: Locator): Promise<string> {
    return control.evaluate((el) => {
      if (el instanceof HTMLSelectElement) return el.options[el.selectedIndex]?.text ?? '';
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value;
      return (el.textContent ?? '').trim();
    });
  }

  /** Options of a native select or custom combobox. */
  async optionsOf(control: Locator): Promise<string[]> {
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      return (await control.locator('option').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    }
    await control.click();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    await this.page.keyboard.press('Escape');
    return options;
  }

  /** After a rejected input the stored value must not be the rejected one (reload and compare). */
  async expectValueNotSaved(control: Locator, rejected: string): Promise<void> {
    await this.reload();
    await expect(control).not.toHaveValue(rejected);
  }

  applicationIdFromUrl(): string {
    const match = this.page.url().match(/\/applications\/([^/?#]+)/);
    if (!match || match[1] === 'new') {
      throw new Error(`No application id in URL: ${this.page.url()}`);
    }
    return match[1];
  }

  async expectUrl(pattern: RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  /** Full visible text of the page body (for "no data of another agent is rendered" checks). */
  async bodyText(): Promise<string> {
    return this.page.locator('body').innerText();
  }

  get current(): Page {
    return this.page;
  }
}
