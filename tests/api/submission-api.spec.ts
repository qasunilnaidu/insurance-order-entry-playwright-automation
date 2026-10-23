import { test, expect } from '../../fixtures/auth.fixture';
import { expectClientError, expectErrorStructure, findDeep } from '../../utils/assertions';
import { tc } from '../../utils/testCase';

test(...tc('TC-API-05'), async ({ api }) => {
  const id = await api.createApplication();
  const res = await api.post(`/api/applications/${id}/submit`, {});
  expectClientError(res.status());
  const body = await api.json(res);
  expectErrorStructure(body);
  expect(findDeep(body, /^(reference|referenceNumber|reference_number)$/i)).toBeUndefined();

  const status = await api.getJson(`/api/applications/${id}/status`);
  expect(JSON.stringify(status.body).toLowerCase()).toContain('draft');
});
