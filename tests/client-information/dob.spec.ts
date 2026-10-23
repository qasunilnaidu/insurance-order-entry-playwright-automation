import { buildClient } from '../../fixtures/applicationData';
import { dobs, malformedDobs } from '../../fixtures/testData';
import { test } from '../../fixtures/auth.fixture';
import { ageOn } from '../../utils/dataGenerator';
import { completeClient, startApplication } from '../../utils/testHelpers';
import { appGap, seededDefect, tc } from '../../utils/testCase';

test.describe('Client information - date of birth rules', () => {
  let applicationId: string;

  test.beforeEach(async ({ agent }) => {
    applicationId = await startApplication(agent);
    await agent.client.goto(applicationId);
  });

  // The app enforces the 18-65 age range in the submission validation on Review
  // (ApplicationValidationService), not on the client step itself.
  test(...tc('TC-CLI-03'), async ({ agent }) => {
    // 17y364d: DEF-CLI-003 (age off by one) computes 18, so the under-18 error does not appear
    seededDefect('DEF-CLI-003');
    await completeClient(agent, applicationId, buildClient({ dob: dobs.underage })); // 17 years 364 days
    await agent.review.goto(applicationId);
    test.expect(await agent.review.summaryText()).toMatch(/at least 18|18 years/i);
  });

  test(...tc('TC-CLI-04'), async ({ agent }) => {
    await completeClient(agent, applicationId, buildClient({ dob: dobs.over65 })); // 65 years + 1 day
    await agent.review.goto(applicationId);
    test.expect(await agent.review.summaryText()).toMatch(/older than 65|65 years/i);
  });

  test(...tc('TC-CLI-05'), async ({ agent }) => {
    await agent.client.fill(buildClient({ dob: dobs.tomorrow }));
    await agent.client.expectNextBlocked();
    await agent.client.expectError(/future|invalid|valid date|date of birth|today|birth/i);
    await agent.client.expectValueNotSaved(agent.client.dob, dobs.tomorrow);
  });

  test(...tc('TC-CLI-06'), async ({ agent }) => {
    // Boundary ages are inclusive (confirm in Open Items #3 - adjust if the spec says 65 is exclusive)
    for (const dob of [dobs.exactly18, dobs.exactly65]) {
      await agent.client.goto(applicationId);
      await agent.client.fill(buildClient({ dob }));
      await agent.client.nextStep();
      await agent.client.expectNoErrors();

      // Accepted value is stored
      await agent.client.goto(applicationId);
      await test.expect(agent.client.dob).toHaveValue(dob);
    }
  });

  test(...tc('TC-CLI-07'), async ({ agent }) => {
    // adult40 has the birthday TODAY, which is exactly what DEF-CLI-003 (age off by one) gets wrong
    seededDefect('DEF-CLI-003');
    // 40 years, and 39 years 364 days (birthday is tomorrow, so the age is still 39).
    // The client step shows no age; the calculated age is shown on Review.
    for (const dob of [dobs.adult40, dobs.almost40]) {
      await completeClient(agent, applicationId, buildClient({ dob }));
      await agent.review.goto(applicationId);
      test.expect(await agent.review.readCalculatedAge(), `calculated age for DOB ${dob}`).toBe(ageOn(dob));
    }
  });

  test(...tc('TC-CLI-09'), async ({ agent }) => {
    appGap('malformed / pre-1900 DOB values are accepted');
    // "01-01-1850" as text, plus the ISO form so a year before 1900 is also exercised on date inputs
    for (const raw of [...malformedDobs, '1850-01-01']) {
      await agent.client.fill(buildClient());
      await agent.client.typeDob(raw);
      await agent.client.expectNextBlocked();
      await agent.client.expectError(/date|format|invalid|range|birth|required/i);
      await agent.client.expectNoAgeShown();
      await agent.client.expectValueNotSaved(agent.client.dob, raw);
    }
  });
});
