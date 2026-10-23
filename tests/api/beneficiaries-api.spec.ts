import { buildBeneficiary } from '../../fixtures/applicationData';
import { dobs } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { beneficiaryPayload } from '../../utils/apiPayloads';
import { expectClientError, expectErrorStructure } from '../../utils/assertions';
import { tc } from '../../utils/testCase';

test(...tc('TC-API-11'), async ({ api }) => {
  const id = await api.createApplication();
  const path = `/api/applications/${id}/beneficiaries`;
  const marker = buildBeneficiary({ name: 'Rejected Candidate' });

  // Allocation 99% / 101% (validated on the aggregate, so use the validate endpoint after posting)
  const cases: Array<{ name: string; payload: Record<string, unknown> }> = [
    { name: 'allocation 101%', payload: beneficiaryPayload({ ...marker, allocation: 101 }) },
    { name: 'minor without guardian', payload: beneficiaryPayload({ ...marker, dob: dobs.minor, guardianName: undefined }) },
  ];
  for (const c of cases) {
    const res = await api.post(path, c.payload);
    expectClientError(res.status(), `${c.name} must be rejected`);
    expectErrorStructure(await api.json(res));
  }

  // Duplicate (name + DOB + relationship)
  const first = buildBeneficiary({ allocation: 50 });
  expect((await api.post(path, beneficiaryPayload(first))).ok()).toBe(true);
  const dup = await api.post(path, beneficiaryPayload(first));
  expectClientError(dup.status(), 'duplicate must be rejected');
  expectErrorStructure(await api.json(dup));

  // Under-allocation (99%) is reported by validate
  await api.post(path, beneficiaryPayload(buildBeneficiary({ allocation: 49 })));
  const validate = await api.json(await api.post(`/api/applications/${id}/validate`, {}));
  expect(JSON.stringify(validate)).toMatch(/allocation|100/i);

  // Rejected data was not stored
  const stored = JSON.stringify((await api.getJson(path)).body);
  expect(stored).not.toContain('Rejected Candidate');
});
