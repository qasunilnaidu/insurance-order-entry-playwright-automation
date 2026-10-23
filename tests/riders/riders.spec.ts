import { buildClient } from '../../fixtures/applicationData';
import { test, expect } from '../../fixtures/auth.fixture';
import { dobForAge } from '../../utils/dataGenerator';
import { env } from '../../utils/env';
import { applicationReadyForRiders, completeApplicantSections, saveProduct, startApplication } from '../../utils/testHelpers';
import { buildPolicy } from '../../fixtures/applicationData';
import { appGap, seededDefect, tc } from '../../utils/testCase';

const adb = (): RegExp => new RegExp(env.riderAdb, 'i');

test.describe('Rider selection', () => {
  let id: string;

  test.beforeEach(async ({ agent }) => {
    id = await applicationReadyForRiders(agent);
    await agent.riders.goto(id);
  });

  test(...tc('TC-RID-01'), async ({ agent }) => {
    appGap('riders page shows only "Current rider premium", no itemized rider summary');
    await agent.riders.select(adb());
    expect(await agent.riders.isSelected(adb())).toBe(true);
    await agent.riders.expectInSummary(adb());
  });

  test(...tc('TC-RID-02'), async ({ agent }) => {
    seededDefect('DEF-RIDER-002');
    const faceValue = buildPolicy().faceValue;
    await agent.riders.select(adb());

    // Coverage inputs step in 1,000s: exceed the base by one step so the browser lets the value through
    // and the "rider coverage <= face value" rule (not the step check) is what gets exercised.
    const above = faceValue + 1000;
    await agent.riders.setCoverage(adb(), above);
    await agent.riders.expectAnyError();
    await agent.riders.expectValueNotSaved(
      agent.riders.riderRow(adb()).locator('input[type="number"], input[name*="coverage" i], [data-testid="rider-coverage"]').first(),
      String(above),
    );

    await agent.riders.setCoverage(adb(), faceValue);
    await agent.riders.expectNoErrors();
  });

  test(...tc('TC-RID-03'), async ({ agent }) => {
    appGap('no age-eligibility rule for riders');
    // New application with a client near the upper age limit for riders
    const oldId = await startApplication(agent);
    await completeApplicantSections(agent, oldId, { client: buildClient({ dob: dobForAge(env.riderIneligibleAge) }) });
    await saveProduct(agent, oldId);
    await agent.riders.goto(oldId);

    await agent.riders.expectDisabledOrBlocked(adb());
    await agent.riders.expectNotInSummary(adb());
  });

  test(...tc('TC-RID-04'), async ({ agent }) => {
    const names = await agent.riders.riderNames();
    test.skip(names.length <= env.maxRiders, `Fewer than ${env.maxRiders + 1} riders available to exceed the limit`);

    const selected: string[] = [];
    for (const name of names) {
      if (selected.length === env.maxRiders) break;
      await agent.riders.select(name);
      if (await agent.riders.isSelected(name)) selected.push(name);
    }
    expect(selected.length).toBe(env.maxRiders);

    const extra = names.find((n) => !selected.includes(n)) as string;
    await agent.riders.expectDisabledOrBlocked(extra);
    expect(await agent.riders.isSelected(extra)).toBe(false);
    await agent.riders.expectNotInSummary(extra);
  });

  test(...tc('TC-RID-05'), async ({ agent }) => {
    seededDefect('DEF-RIDER-001');
    await agent.riders.select(new RegExp(env.riderWaiver1, 'i'));
    await agent.riders.expectDisabledOrBlocked(new RegExp(env.riderWaiver2, 'i'));
    expect(await agent.riders.isSelected(new RegExp(env.riderWaiver2, 'i'))).toBe(false);
    await agent.riders.expectNotInSummary(new RegExp(env.riderWaiver2, 'i'));
  });

  test(...tc('TC-RID-06'), async ({ agent }) => {
    appGap('no health questionnaire for the critical illness rider');
    await agent.riders.select(new RegExp(env.riderCriticalIllness, 'i'));
    await expect(agent.riders.questionnaire).toBeVisible();

    // Mandatory: moving on without answering is blocked
    await agent.riders.expectNextBlocked();
  });

  test(...tc('TC-RID-07'), async ({ agent }) => {
    const base = await agent.riders.readTotalPremium();
    await agent.riders.select(adb());
    const riderPremium = await agent.riders.readRiderPremium(adb());
    expect(riderPremium).toBeGreaterThan(0);
    await expect.poll(() => agent.riders.readTotalPremium()).toBeCloseTo(base + riderPremium, 2);
  });

  test(...tc('TC-RID-08'), async ({ agent }) => {
    test.skip(!env.riderDependent || !env.riderPrerequisite, 'RIDER_DEPENDENT / RIDER_PREREQUISITE not configured (Open Items)');
    const dependent = new RegExp(env.riderDependent, 'i');
    const prerequisite = new RegExp(env.riderPrerequisite, 'i');

    await agent.riders.expectDisabledOrBlocked(dependent);
    expect(await agent.riders.isSelected(dependent)).toBe(false);

    await agent.riders.select(prerequisite);
    await agent.riders.select(dependent);
    expect(await agent.riders.isSelected(dependent)).toBe(true);
    await agent.riders.expectInSummary(dependent);
  });

  test(...tc('TC-RID-09'), async ({ agent }) => {
    const base = await agent.riders.readTotalPremium();
    await agent.riders.select(adb());
    await expect.poll(() => agent.riders.readTotalPremium()).toBeGreaterThan(base);

    await agent.riders.deselect(adb());
    await agent.riders.expectNotInSummary(adb());
    await expect.poll(() => agent.riders.readTotalPremium()).toBeCloseTo(base, 2);

    await agent.riders.nextStep();
    await agent.review.goto(id);
    await agent.review.expectNotInSummaryText(env.riderAdb);
  });
});
