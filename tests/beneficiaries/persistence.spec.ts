import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { addBeneficiaries, applicationReadyForRiders, primaryBeneficiaries, secondaryBeneficiaries } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-BEN-14'), async ({ agent, api }) => {
  const id = await applicationReadyForRiders(agent);
  const list = [...primaryBeneficiaries([60, 40]), ...secondaryBeneficiaries([100])];
  await addBeneficiaries(agent, id, list);
  await agent.beneficiaries.saveDraft();

  await agent.dashboard.goto();
  await agent.dashboard.resumeDraft(id);
  await agent.beneficiaries.goto(id);

  await agent.beneficiaries.expectCount(3);
  const names = (await agent.beneficiaries.names()).join('\n');
  for (const b of list) expect(names).toContain(b.name);
  expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(100);
  expect(await agent.beneficiaries.readAllocationTotal('Secondary')).toBe(100);

  // Backend cross-check: GET beneficiaries returns the same records
  await apiCrossCheck(api, 'GET beneficiaries', async () => {
    const { status, body } = await api.getJson(`/api/applications/${id}/beneficiaries`);
    expect(status).toBe(200);
    for (const b of list) expect(JSON.stringify(body)).toContain(b.name);
  });
});
