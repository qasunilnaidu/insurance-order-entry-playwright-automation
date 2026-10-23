import { test, expect } from '../../fixtures/auth.fixture';
import { applicationReadyForReview, primaryBeneficiaries, startApplication, completeClient } from '../../utils/testHelpers';
import { appGap, seededDefect, tc } from '../../utils/testCase';

test.describe('Validation summary on review', () => {
  test(...tc('TC-VAL-01'), async ({ agent }) => {
    // Client only: address, KYC, product, beneficiaries and documents are missing
    const id = await startApplication(agent);
    await completeClient(agent, id);
    await agent.review.goto(id);

    await agent.review.expectSummaryListsErrors(3);
    const text = await agent.review.summaryText();
    // Beneficiaries are optional in this app (estate assignment applies), and missing documents are not
    // listed because of seeded defect DEF-DOC-001 (covered by TC-DOC-04).
    for (const section of [/address/i, /kyc|identi/i, /financial/i, /product/i]) {
      expect(text).toMatch(section);
    }
    // No phantom errors for the section that is complete
    expect(text).not.toMatch(/first name|last name|date of birth/i);
  });

  test(...tc('TC-VAL-02'), async ({ agent }) => {
    appGap('validation summary items are plain text, not links to the field');
    const id = await startApplication(agent);
    await completeClient(agent, id);
    await agent.review.goto(id);

    await agent.review.expectSummaryListsErrors();
    await agent.review.clickFirstSummaryItem();
    await expect(agent.page).not.toHaveURL(/\/review/);
    await expect(agent.page.locator(':focus, [aria-invalid="true"]').first()).toBeVisible();
  });

  test(...tc('TC-VAL-03'), async ({ agent }) => {
    const id = await startApplication(agent);
    await completeClient(agent, id);
    await agent.review.goto(id);
    await agent.review.expectSubmitDisabled();

    // Fix every error by completing the application, then re-check
    const app = await applicationReadyForReview(agent);
    await agent.review.expectSummaryClean();
    await agent.review.expectSubmitEnabled();
    expect(app.id).not.toBe(id);
  });

  test(...tc('TC-VAL-04'), async ({ agent }) => {
    seededDefect('DEF-BEN-001');
    const app = await applicationReadyForReview(agent, { beneficiaries: primaryBeneficiaries([60, 40]) });
    await agent.review.expectSummaryClean();

    // Invalidate upstream data: remove the 40% beneficiary
    await agent.beneficiaries.goto(app.id);
    await agent.beneficiaries.remove(1);
    await agent.review.goto(app.id);

    await agent.review.expectSummaryListsErrors();
    expect(await agent.review.summaryText()).toMatch(/allocation|100|beneficiar/i);
    await agent.review.expectSubmitDisabled();
  });
});
