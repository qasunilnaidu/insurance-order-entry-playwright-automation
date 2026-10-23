import { buildBeneficiary } from '../../fixtures/applicationData';
import { invalidAllocations } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { apiCrossCheck } from '../../utils/apiCrossCheck';
import { applicationReadyForRiders, primaryBeneficiaries, secondaryBeneficiaries } from '../../utils/testHelpers';
import { appGap, seededDefect, tc } from '../../utils/testCase';

test.describe('Beneficiary allocation rules', () => {
  let id: string;

  test.beforeEach(async ({ agent }) => {
    id = await applicationReadyForRiders(agent);
    await agent.beneficiaries.goto(id);
  });

  test(...tc('TC-BEN-02'), async ({ agent, api }) => {
    seededDefect('DEF-BEN-001');
    for (const b of primaryBeneficiaries([60, 39])) await agent.beneficiaries.add(b);
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(99);
    await agent.beneficiaries.expectNextBlocked();
    await agent.beneficiaries.expectError(/100|allocation|total/i);

    // Backend cross-check: POST /validate returns an allocation error
    await apiCrossCheck(api, 'POST validate', async () => {
      const res = await api.post(`/api/applications/${id}/validate`, {});
      expect(JSON.stringify(await api.json(res))).toMatch(/allocation|100/i);
    });
  });

  test(...tc('TC-BEN-03'), async ({ agent }) => {
    // The app blocks the beneficiary that would push the total over 100% with a native alert(),
    // so the second one is never saved and the total stays at 60%.
    for (const b of primaryBeneficiaries([60, 41])) await agent.beneficiaries.add(b);
    await agent.beneficiaries.expectError(/100|allocation|total|exceed/i);
    await agent.beneficiaries.expectCount(1);
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(60);
  });

  test(...tc('TC-BEN-04'), async ({ agent }) => {
    seededDefect('DEF-BEN-001');
    for (const b of primaryBeneficiaries([100])) await agent.beneficiaries.add(b);
    for (const b of secondaryBeneficiaries([50, 40])) await agent.beneficiaries.add(b);
    expect(await agent.beneficiaries.readAllocationTotal('Secondary')).toBe(90);
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(100);
    await agent.beneficiaries.expectNextBlocked();
    await agent.beneficiaries.expectError(/secondary/i);

    // Correct the secondary total to 100%
    const lastIndex = (await agent.beneficiaries.cards.count()) - 1;
    await agent.beneficiaries.edit(lastIndex, { allocation: 50 });
    expect(await agent.beneficiaries.readAllocationTotal('Secondary')).toBe(100);
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(100);
    await agent.beneficiaries.nextStep();
    await agent.beneficiaries.expectNoErrors();
  });

  test(...tc('TC-BEN-09'), async ({ agent }) => {
    for (const b of primaryBeneficiaries([60, 40])) await agent.beneficiaries.add(b);
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(100);

    await agent.beneficiaries.remove(1); // the 40% beneficiary
    await agent.beneficiaries.expectCount(1);
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(60);
    // That a 60% total does not block progression is DEF-BEN-001, covered by TC-BEN-02 / TC-BEN-04.
  });

  test(...tc('TC-BEN-11'), async ({ agent, api }) => {
    appGap('no primary beneficiary is allowed by design (estate assignment applies)');
    await agent.beneficiaries.expectNextBlocked();
    await agent.beneficiaries.expectError(/primary|beneficiar/i);

    // Review summary lists the missing primary beneficiary
    await agent.review.goto(id);
    expect(await agent.review.summaryText()).toMatch(/primary|beneficiar/i);
    await agent.review.expectSubmitDisabled();

    await apiCrossCheck(api, 'GET beneficiaries', async () => {
      const res = await api.get(`/api/applications/${id}/beneficiaries`);
      expect(JSON.stringify(await api.json(res))).not.toMatch(/"allocation"/i);
    });
  });

  test(...tc('TC-BEN-13'), async ({ agent }) => {
    appGap('0% (and other invalid) allocations are saved');
    for (const bad of invalidAllocations) {
      await agent.beneficiaries.fillForm(buildBeneficiary({ allocation: 100 }));
      await agent.beneficiaries.typeRaw(agent.beneficiaries.allocation, bad);
      await agent.beneficiaries.saveButton.click();
      await agent.beneficiaries.expectAnyError();
      await agent.beneficiaries.expectCount(0); // nothing saved with an invalid value
      await agent.beneficiaries.reload();
    }
  });
});
