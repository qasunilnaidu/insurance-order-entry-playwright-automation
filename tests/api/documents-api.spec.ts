import { test, expect } from '../../fixtures/auth.fixture';
import { expectClientError, expectErrorStructure } from '../../utils/assertions';
import { invalidExe, overLimitPdf, validPdf } from '../../utils/fileUploadHelper';
import { tc } from '../../utils/testCase';

test(...tc('TC-API-12'), async ({ api }) => {
  const id = await api.createApplication();
  const path = `/api/applications/${id}/documents`;

  for (const file of [invalidExe(), overLimitPdf()]) {
    const res = await api.upload(path, file);
    expectClientError(res.status(), `${file.name} must be rejected`);
    expectErrorStructure(await api.json(res));
  }

  const ok = await api.upload(path, validPdf());
  expect(ok.ok(), `valid upload returned ${ok.status()}`).toBe(true);
  const list = JSON.stringify((await api.getJson(path)).body);
  expect(list).toContain('valid.pdf');
  expect(list).not.toContain('invalid.exe');
  expect(list).not.toContain('over-limit');
});
