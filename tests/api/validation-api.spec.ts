import { test, expect } from '../../fixtures/auth.fixture';
import { beneficiaryPayload } from '../../utils/apiPayloads';
import { expectErrorStructure } from '../../utils/assertions';
import { buildBeneficiary } from '../../fixtures/applicationData';
import { tc } from '../../utils/testCase';

test(...tc('TC-API-04'), async ({ api }) => {
  const id = await api.createApplication();
  for (const allocation of [60, 39]) {
    await api.post(`/api/applications/${id}/beneficiaries`, beneficiaryPayload(buildBeneficiary({ allocation })));
  }
  const res = await api.post(`/api/applications/${id}/validate`, {});
  const body = await api.json(res);
  expectErrorStructure(body);
  expect(JSON.stringify(body)).toMatch(/allocation|100/i);
});
