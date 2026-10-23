import { dobForAge, dobYearsAgo, randomEmail, randomFirstName, randomLastName, randomMobile, futureDate, pastDate } from '../utils/dataGenerator';
import { env } from '../utils/env';

export interface ClientData {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  occupation: string;
  employer: string;
}

export interface AddressData {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  mobile: string;
  alternatePhone: string;
  preferredContact: string;
}

export interface KycData {
  idType: string;
  idNumber: string;
  issueDate: string;
  expiryDate: string;
  annualIncome: string;
  netWorth: string;
  sourceOfFunds: string;
  riskProfile: string;
  /** null = leave the PEP / compliance declaration unanswered */
  pep: boolean | null;
}

export interface PolicyConfig {
  faceValue: number;
  frequency: string;
  paymentTerm?: string;
  policyTerm?: string;
}

export interface BeneficiaryData {
  type: 'Individual' | 'Trust' | 'Organization';
  category: 'Primary' | 'Secondary';
  name: string;
  dob: string;
  relationship: string;
  allocation: number;
  guardianName?: string;
  guardianRelationship?: string;
  trustName?: string;
  trusteeName?: string;
  trustDate?: string;
  organizationName?: string;
  registrationNumber?: string;
  contactEmail?: string;
  irrevocable?: boolean;
}

export function buildClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    firstName: randomFirstName(),
    lastName: randomLastName(),
    dob: dobYearsAgo(40),
    gender: 'MALE',
    maritalStatus: 'MARRIED',
    nationality: 'United States',
    occupation: 'Software Engineer',
    employer: 'Acme Technologies',
    ...overrides,
  };
}

export function buildAddress(overrides: Partial<AddressData> = {}): AddressData {
  return {
    line1: '12 Lake View Road',
    city: 'Austin',
    state: 'CA',
    postalCode: '73301',
    country: 'US',
    email: randomEmail('insured'),
    mobile: randomMobile(),
    alternatePhone: randomMobile(),
    preferredContact: 'Email',
    ...overrides,
  };
}

export function buildKyc(overrides: Partial<KycData> = {}): KycData {
  return {
    idType: 'PASSPORT',
    idNumber: 'N1234567',
    issueDate: pastDate(365),
    expiryDate: futureDate(365 * 5),
    annualIncome: '1500000',
    netWorth: '8000000',
    sourceOfFunds: 'SALARY',
    riskProfile: 'MODERATE',
    pep: false,
    ...overrides,
  };
}

export function buildPolicy(overrides: Partial<PolicyConfig> = {}): PolicyConfig {
  return {
    faceValue: Math.max(env.faceValueMin, 100000),
    frequency: 'Monthly',
    paymentTerm: '10',
    policyTerm: 'WHOLE_LIFE',
    ...overrides,
  };
}

export function buildBeneficiary(overrides: Partial<BeneficiaryData> = {}): BeneficiaryData {
  return {
    type: 'Individual',
    category: 'Primary',
    name: `${randomFirstName()} ${randomLastName()}`,
    dob: dobForAge(30),
    relationship: 'Spouse',
    allocation: 100,
    ...overrides,
  };
}
