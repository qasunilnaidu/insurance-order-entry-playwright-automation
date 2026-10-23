import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForRiders } from '../../utils/testHelpers';
import { extractList } from '../../utils/assertions';
import { tc } from '../../utils/testCase';

test(...tc('TC-API-10'), async ({ agent, api }) => {
  const { status, body } = await api.getJson('/api/riders');
  expect(status).toBe(200);
  const riders = extractList<Record<string, unknown>>(body);
  expect(riders.length).toBeGreaterThan(0);
  for (const r of riders) {
    expect(['string', 'number']).toContain(typeof r.id);
    expect(typeof r.name).toBe('string');
    const json = JSON.stringify(r).toLowerCase();
    expect(json, 'category').toMatch(/categor|type/);
    expect(json, 'eligibility / limits').toMatch(/eligib|age|limit|max|min/);
  }

  // Matches the UI rider list
  const id = await applicationReadyForRiders(agent);
  await agent.riders.goto(id);
  const uiNames = (await agent.riders.riderNames()).map((n) => n.toLowerCase());
  expect(uiNames.length).toBeGreaterThan(0);
  const apiNames = riders.map((r) => String(r.name).toLowerCase());
  for (const name of uiNames) expect(apiNames.some((a) => name.includes(a) || a.includes(name))).toBe(true);
});
