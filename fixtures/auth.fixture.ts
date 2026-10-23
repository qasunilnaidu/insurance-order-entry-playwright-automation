import { test as base, expect, Page } from '@playwright/test';
import { AddressContactPage } from '../pages/AddressContactPage';
import { ApplicationStatusPage } from '../pages/ApplicationStatusPage';
import { BeneficiaryPage } from '../pages/BeneficiaryPage';
import { ClientInformationPage } from '../pages/ClientInformationPage';
import { ConfirmationPage } from '../pages/ConfirmationPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DocumentUploadPage } from '../pages/DocumentUploadPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { KycFinancialPage } from '../pages/KycFinancialPage';
import { LoginPage } from '../pages/LoginPage';
import { ProductCatalogPage } from '../pages/ProductCatalogPage';
import { ProductConfigurationPage } from '../pages/ProductConfigurationPage';
import { ReviewPage } from '../pages/ReviewPage';
import { RiderSelectionPage } from '../pages/RiderSelectionPage';
import { ApiClient } from '../utils/apiClient';
import { users, UserCredentials } from './users';

/** Bundle of every page object so tests only need one fixture. */
export class Pages {
  readonly login: LoginPage;
  readonly forgot: ForgotPasswordPage;
  readonly dashboard: DashboardPage;
  readonly client: ClientInformationPage;
  readonly address: AddressContactPage;
  readonly kyc: KycFinancialPage;
  readonly catalog: ProductCatalogPage;
  readonly product: ProductConfigurationPage;
  readonly riders: RiderSelectionPage;
  readonly beneficiaries: BeneficiaryPage;
  readonly documents: DocumentUploadPage;
  readonly review: ReviewPage;
  readonly confirmation: ConfirmationPage;
  readonly status: ApplicationStatusPage;

  constructor(readonly page: Page) {
    this.login = new LoginPage(page);
    this.forgot = new ForgotPasswordPage(page);
    this.dashboard = new DashboardPage(page);
    this.client = new ClientInformationPage(page);
    this.address = new AddressContactPage(page);
    this.kyc = new KycFinancialPage(page);
    this.catalog = new ProductCatalogPage(page);
    this.product = new ProductConfigurationPage(page);
    this.riders = new RiderSelectionPage(page);
    this.beneficiaries = new BeneficiaryPage(page);
    this.documents = new DocumentUploadPage(page);
    this.review = new ReviewPage(page);
    this.confirmation = new ConfirmationPage(page);
    this.status = new ApplicationStatusPage(page);
  }

  async loginAs(user: UserCredentials): Promise<void> {
    await this.login.goto();
    await this.login.login(user.username, user.password);
  }

  /** Logs in and waits for the dashboard. */
  async signIn(user: UserCredentials): Promise<void> {
    await this.loginAs(user);
    await this.login.expectDashboard();
  }
}

type Fixtures = {
  /** Page objects on a fresh, unauthenticated browser context. */
  pages: Pages;
  /** Page objects already logged in as the primary seeded agent. */
  agent: Pages;
  /** Authenticated API client for the primary seeded agent. */
  api: ApiClient;
  /** API client with no credentials (authorization tests). */
  anonymousApi: ApiClient;
  /** A second, independent browser context (own cookies/storage) with page objects. */
  freshContext: () => Promise<{ pages: Pages; close: () => Promise<void> }>;
};

export const test = base.extend<Fixtures>({
  pages: async ({ page }, use) => {
    await use(new Pages(page));
  },

  agent: async ({ page }, use) => {
    const pages = new Pages(page);
    await pages.signIn(users.valid);
    await use(pages);
  },

  api: async ({}, use) => {
    const client = await ApiClient.create({ authenticated: true });
    await use(client);
    await client.dispose();
  },

  anonymousApi: async ({}, use) => {
    const client = await ApiClient.create();
    await use(client);
    await client.dispose();
  },

  freshContext: async ({ browser }, use) => {
    const contexts: { close: () => Promise<void> }[] = [];
    await use(async () => {
      const context = await browser.newContext();
      contexts.push(context);
      return { pages: new Pages(await context.newPage()), close: () => context.close() };
    });
    for (const context of contexts) await context.close().catch(() => undefined);
  },
});

export { expect };
