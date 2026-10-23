import { BeneficiaryData, ClientData } from '../fixtures/applicationData';

/**
 * Request bodies for the API tests. Field names mirror the UI labels; both "dob" and
 * "dateOfBirth" are sent because the exact name has to be confirmed against the API
 * specification (Open Items #13). Change them here once to fix every API test.
 */
export function clientPayload(client: ClientData): Record<string, unknown> {
  return {
    firstName: client.firstName,
    lastName: client.lastName,
    dob: client.dob,
    dateOfBirth: client.dob,
    gender: client.gender,
    maritalStatus: client.maritalStatus,
    nationality: client.nationality,
    occupation: client.occupation,
    employer: client.employer,
  };
}

export function beneficiaryPayload(b: BeneficiaryData): Record<string, unknown> {
  return {
    type: b.type,
    beneficiaryType: b.type,
    category: b.category,
    name: b.name,
    fullName: b.name,
    dob: b.dob,
    dateOfBirth: b.dob,
    relationship: b.relationship,
    allocation: b.allocation,
    allocationPercentage: b.allocation,
    guardianName: b.guardianName,
    guardianRelationship: b.guardianRelationship,
    irrevocable: b.irrevocable ?? false,
  };
}

/** Looks for a validation error mentioning a topic in any shape of error body. */
export function mentions(body: unknown, pattern: RegExp): boolean {
  return pattern.test(JSON.stringify(body ?? ''));
}
