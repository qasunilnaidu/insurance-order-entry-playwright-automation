import { test, expect } from '../../fixtures/auth.fixture';
import { env } from '../../utils/env';
import { findDeep } from '../../utils/assertions';
import { submitCompleteApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-API-14'), async ({ agent, api }) => {
  const draftId = env.seededDraftId || (await api.createApplication());
  const draft = await api.getJson(`/api/applications/${draftId}/status`);
  expect(draft.status).toBe(200);
  expect(String(findDeep(draft.body, /^(status|currentStatus)$/i)).toLowerCase()).toContain('draft');

  const submittedId = env.seededSubmittedId || (await submitCompleteApplication(agent)).id;
  const submitted = await api.getJson(`/api/applications/${submittedId}/status`);
  expect(submitted.status).toBe(200);
  expect(String(findDeep(submitted.body, /^(status|currentStatus)$/i)).toLowerCase()).toContain('submitted');

  const json = JSON.stringify(submitted.body);
  expect(json.toLowerCase()).toMatch(/history/);
  const stamps = json.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g) ?? [];
  expect(stamps.length, 'timestamps in history').toBeGreaterThan(0);
  for (const s of stamps) expect(Number.isNaN(Date.parse(s))).toBe(false);
  const times = stamps.map((s) => Date.parse(s));
  const ascending = times.every((t, k) => k === 0 || t >= times[k - 1]);
  const descending = times.every((t, k) => k === 0 || t <= times[k - 1]);
  expect(ascending || descending, 'history entries are chronologically ordered').toBe(true);
});
