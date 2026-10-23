import { test, expect } from '../../fixtures/auth.fixture';
import { invalidExe, invalidTxt, overLimitPdf, underLimitPdf, validJpg, validPdf, validPng } from '../../utils/fileUploadHelper';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { applicationReadyForRiders } from '../../utils/testHelpers';
import { seededDefect, tc } from '../../utils/testCase';

test.describe('Document upload', () => {
  let id: string;

  test.beforeEach(async ({ agent }) => {
    id = await applicationReadyForRiders(agent);
    await agent.documents.goto(id);
  });

  test(...tc('TC-DOC-01'), async ({ agent }) => {
    for (const file of [validPdf(), validJpg(), validPng()]) {
      await agent.documents.upload(file.path);
      await agent.documents.expectUploaded(file.name);
    }
  });

  test(...tc('TC-DOC-02'), async ({ agent }) => {
    for (const file of [invalidExe(), invalidTxt()]) {
      await agent.documents.upload(file.path);
      await agent.documents.expectRejected(/unsupported|invalid|file type|not allowed|allowed|pdf|jpg|png/i);
    }
    await agent.documents.expectNothingUploaded();
    await agent.documents.reload();
    await agent.documents.expectNothingUploaded();
  });

  test(...tc('TC-DOC-03'), async ({ agent, api }) => {
    const over = overLimitPdf();
    await agent.documents.upload(over.path);
    await agent.documents.expectRejected(/size|large|exceed|limit|MB/i);
    await agent.documents.expectNothingUploaded();

    const under = underLimitPdf();
    await agent.documents.upload(under.path);
    await agent.documents.expectUploaded(under.name);

    // Backend cross-check: the API also rejects the oversize file
    await apiCrossCheck(api, 'POST oversize document', async () => {
      const res = await api.upload(`/api/applications/${id}/documents`, over);
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
    });
  });

  test(...tc('TC-DOC-04'), async ({ agent }) => {
    seededDefect('DEF-DOC-001');
    await agent.review.goto(id);
    expect(await agent.review.summaryText()).toMatch(/document/i);
    await agent.review.expectSubmitDisabled();
    await agent.documents.goto(id);
    await agent.documents.expectNothingUploaded();
  });

  test(...tc('TC-DOC-05'), async ({ agent }) => {
    const file = validPdf();
    await agent.documents.upload(file.path);
    await agent.documents.expectUploaded(file.name);

    await agent.documents.reload();
    await agent.documents.expectUploaded(file.name);

    await agent.dashboard.goto();
    await agent.dashboard.resumeDraft(id);
    await agent.documents.goto(id);
    await agent.documents.expectUploaded(file.name);
    expect((await agent.documents.uploadedNames()).join('\n')).toContain(file.name);
  });
});
