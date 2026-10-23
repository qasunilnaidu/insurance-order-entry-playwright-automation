import { buildBeneficiary } from '../../fixtures/applicationData';
import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForRiders } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Beneficiaries', () => {
  let id: string;

  test.beforeEach(async ({ agent }) => {
    id = await applicationReadyForRiders(agent);
    await agent.beneficiaries.goto(id);
  });

  test(...tc('TC-BEN-01'), async ({ agent }) => {
    const b = buildBeneficiary({ allocation: 100 });
    await agent.beneficiaries.add(b);
    await agent.beneficiaries.expectCount(1);
    expect((await agent.beneficiaries.names())[0]).toContain(b.name);
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(100);
  });

  test(...tc('TC-BEN-12'), async ({ agent }) => {
    await agent.beneficiaries.add(buildBeneficiary({ allocation: 100 }));
    await agent.beneficiaries.edit(0, { name: 'Renamed Beneficiary', allocation: 50 });

    expect((await agent.beneficiaries.names())[0]).toContain('Renamed Beneficiary');
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(50);
    // No error for the 50% total is DEF-BEN-001, covered by TC-BEN-02 / TC-BEN-04.

    await agent.beneficiaries.reload();
    expect((await agent.beneficiaries.names())[0]).toContain('Renamed Beneficiary');
    expect(await agent.beneficiaries.readAllocationTotal('Primary')).toBe(50);
  });
});
