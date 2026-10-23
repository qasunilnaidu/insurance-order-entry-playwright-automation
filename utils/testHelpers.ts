import {
  AddressData,
  BeneficiaryData,
  buildAddress,
  buildBeneficiary,
  buildClient,
  buildKyc,
  buildPolicy,
  ClientData,
  KycData,
  PolicyConfig,
} from '../fixtures/applicationData';
import type { Pages } from '../fixtures/auth.fixture';
import { env } from './env';
import { validPdf } from './fileUploadHelper';

/**
 * Reusable business flows. Each helper navigates directly to its route, so a
 * test can jump to any step of an application it has just created (tests stay independent:
 * every test builds its own application with unique generated data).
 */

export async function startApplication(p: Pages): Promise<string> {
  await p.dashboard.goto();
  return p.dashboard.startNewApplication();
}

export async function completeClient(p: Pages, id: string, data: ClientData = buildClient()): Promise<ClientData> {
  await p.client.goto(id);
  await p.client.fill(data);
  await p.client.nextStep();
  await p.client.expectStepSaved('/client');
  return data;
}

export async function completeAddress(p: Pages, id: string, data: AddressData = buildAddress()): Promise<AddressData> {
  await p.address.goto(id);
  await p.address.fillAll(data);
  await p.address.nextStep();
  await p.address.expectStepSaved('/address-contact');
  return data;
}

export async function completeKyc(p: Pages, id: string, data: KycData = buildKyc()): Promise<KycData> {
  await p.kyc.goto(id);
  await p.kyc.fill(data);
  await p.kyc.upload(validPdf().path);
  await p.kyc.nextStep();
  await p.kyc.expectStepSaved('/kyc-financial');
  return data;
}

/** Client + address + KYC/financial: everything before product selection. */
export async function completeApplicantSections(
  p: Pages,
  id: string,
  overrides: { client?: Partial<ClientData>; kyc?: Partial<KycData>; address?: Partial<AddressData> } = {},
): Promise<{ client: ClientData; address: AddressData; kyc: KycData }> {
  const client = await completeClient(p, id, buildClient(overrides.client));
  const address = await completeAddress(p, id, buildAddress(overrides.address));
  const kyc = await completeKyc(p, id, buildKyc(overrides.kyc));
  return { client, address, kyc };
}

export async function configureProduct(p: Pages, id: string, config: PolicyConfig = buildPolicy()): Promise<PolicyConfig> {
  await p.product.goto(id);
  await p.product.selectProduct(env.productName || undefined);
  await p.product.configure(config);
  return config;
}

/** Configure + save the product step (moves on to the next step). */
export async function saveProduct(p: Pages, id: string, config: PolicyConfig = buildPolicy()): Promise<PolicyConfig> {
  const saved = await configureProduct(p, id, config);
  await p.product.nextStep();
  await p.product.expectStepSaved('/product');
  return saved;
}

export async function addBeneficiaries(p: Pages, id: string, list: BeneficiaryData[] = [buildBeneficiary()]): Promise<void> {
  await p.beneficiaries.goto(id);
  for (const b of list) {
    await p.beneficiaries.add(b);
  }
}

/** Primary beneficiaries with the given percentages, e.g. [60, 40]. */
export function primaryBeneficiaries(percentages: number[]): BeneficiaryData[] {
  return percentages.map((allocation) => buildBeneficiary({ category: 'Primary', allocation }));
}

export function secondaryBeneficiaries(percentages: number[]): BeneficiaryData[] {
  return percentages.map((allocation) => buildBeneficiary({ category: 'Secondary', allocation }));
}

export async function uploadRequiredDocuments(p: Pages, id: string): Promise<void> {
  await p.documents.goto(id);
  await p.documents.upload(validPdf().path);
}

/** Starts a new application and completes applicant sections up to product selection. */
export async function applicationReadyForProduct(p: Pages): Promise<string> {
  const id = await startApplication(p);
  await completeApplicantSections(p, id);
  return id;
}

/** ... plus product configuration saved: ready for riders. */
export async function applicationReadyForRiders(p: Pages, config: PolicyConfig = buildPolicy()): Promise<string> {
  const id = await applicationReadyForProduct(p);
  await saveProduct(p, id, config);
  return id;
}

export interface CompletedApplication {
  id: string;
  client: ClientData;
  address: AddressData;
  kyc: KycData;
  policy: PolicyConfig;
  premium: number;
  beneficiaries: BeneficiaryData[];
}

/** Builds a complete, valid application and leaves the browser on /review (nothing submitted). */
export async function applicationReadyForReview(
  p: Pages,
  options: { client?: Partial<ClientData>; beneficiaries?: BeneficiaryData[] } = {},
): Promise<CompletedApplication> {
  const id = await startApplication(p);
  const { client, address, kyc } = await completeApplicantSections(p, id, { client: options.client });
  const policy = await configureProduct(p, id);
  const premium = await p.product.readPremium();
  await p.product.nextStep();
  await p.product.expectStepSaved('/product');
  const beneficiaries = options.beneficiaries ?? [buildBeneficiary()];
  await addBeneficiaries(p, id, beneficiaries);
  await uploadRequiredDocuments(p, id);
  await p.review.goto(id);
  return { id, client, address, kyc, policy, premium, beneficiaries };
}

/** Full happy-path flow ending on the confirmation page. */
export async function submitCompleteApplication(
  p: Pages,
): Promise<CompletedApplication & { reference: string }> {
  const application = await applicationReadyForReview(p);
  await p.review.expectSubmitEnabled();
  await p.review.submit();
  await p.confirmation.expectSuccess();
  const reference = await p.confirmation.readReferenceNumber();
  return { ...application, reference };
}
