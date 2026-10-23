import { buildKyc, buildPolicy } from '../../fixtures/applicationData';
import { idDates, PEP_DETAILS, SYNTHETIC_SSN, validIdNumbers, WRONG_ID_NUMBER } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { expectMasked } from '../../utils/assertions';
import { env } from '../../utils/env';
import { invalidExe, invalidTxt, validPdf } from '../../utils/fileUploadHelper';
import { completeAddress, completeClient, completeKyc, configureProduct, startApplication } from '../../utils/testHelpers';
import { appGap, seededDefect, tc } from '../../utils/testCase';

test.describe('KYC, financial and compliance', () => {
  let applicationId: string;

  test.beforeEach(async ({ agent }) => {
    applicationId = await startApplication(agent);
    await completeClient(agent, applicationId);
    await completeAddress(agent, applicationId);
    await agent.kyc.goto(applicationId);
  });

  test(...tc('TC-KYC-01'), async ({ agent }) => {
    seededDefect('DEF-CLI-002');
    const last4 = SYNTHETIC_SSN.slice(-4);
    await agent.kyc.fill(buildKyc({ idType: 'SSN', idNumber: SYNTHETIC_SSN }));
    await agent.kyc.idNumber.blur();
    expectMasked(await agent.kyc.displayedIdNumber(), last4);

    // Save, then reopen the step: still masked
    await agent.kyc.upload(validPdf().path);
    await agent.kyc.nextStep();
    await agent.kyc.goto(applicationId);
    expectMasked(await agent.kyc.displayedIdNumber(), last4);
  });

  test(...tc('TC-KYC-02'), async ({ agent }) => {
    appGap('server accepts any ID number string (no per-type format rule)');
    const types = await agent.kyc.idTypeOptions();
    test.skip(types.length === 0, 'No ID types found in the ID type control (Open Items #8)');

    await agent.kyc.fill(buildKyc());
    await agent.kyc.upload(validPdf().path);
    for (const type of types) {
      await agent.kyc.chooseIdType(type);

      // Wrong format -> type-specific error
      await agent.kyc.enterIdNumber(WRONG_ID_NUMBER);
      await agent.kyc.expectNextBlocked();
      await agent.kyc.expectError(/id|number|format|invalid/i);

      // Correct format (known formats only) -> accepted
      const valid = validIdNumbers[type.toLowerCase()];
      if (valid) {
        await agent.kyc.enterIdNumber(valid);
        await agent.kyc.expectNoErrors();
      }
    }
  });

  test(...tc('TC-KYC-03'), async ({ agent }) => {
    appGap('KYC step has no file upload');
    for (const file of [invalidExe(), invalidTxt()]) {
      await agent.kyc.upload(file.path);
      await agent.kyc.expectError(/unsupported|invalid|file type|not allowed|allowed|pdf|jpg|png/i);
      await agent.kyc.expectNothingUploaded();
    }
  });

  test(...tc('TC-KYC-04'), async ({ agent }) => {
    appGap('pep_details is not mandatory on the server when PEP = Yes');
    await agent.kyc.fill(buildKyc({ pep: true }));
    await agent.kyc.upload(validPdf().path);

    // 1) details field appears and is mandatory
    await expect(agent.kyc.pepDetails).toBeVisible();
    await agent.kyc.pepDetails.fill('');
    await agent.kyc.expectNextBlocked();
    await agent.kyc.expectError(/pep|detail|political|required/i);

    // Nothing saved while blocked
    await agent.kyc.reload();
    if ((await agent.kyc.displayValue(agent.kyc.pep).catch(() => '')) === 'Yes') {
      await expect(agent.kyc.pepDetails).toHaveValue('');
    }

    // 2) filled details allow progression
    await agent.kyc.fill(buildKyc({ pep: true }));
    await agent.kyc.upload(validPdf().path);
    await agent.kyc.pepDetails.fill(PEP_DETAILS);
    await agent.kyc.nextStep();
    await agent.kyc.expectNoErrors();
  });

  test(...tc('TC-KYC-05'), async ({ agent }) => {
    seededDefect('DEF-FIN-001');
    // Low income on the KYC step, then a high face value on the product step
    await completeKyc(agent, applicationId, buildKyc({ annualIncome: env.lowIncome }));
    await configureProduct(agent, applicationId, buildPolicy({ faceValue: env.faceValueMax }));

    // Rule to be confirmed (Open Items #9): either a warning or a block must be displayed
    await expect(agent.product.warning.or(agent.product.errors.first())).toBeVisible();
  });

  test(...tc('TC-KYC-06'), async ({ agent }) => {
    await agent.kyc.fill(buildKyc({ pep: null })); // declaration left unanswered
    await agent.kyc.upload(validPdf().path);
    await agent.kyc.expectNextBlocked();
    await agent.kyc.expectError(/declaration|pep|compliance|answer|select|required/i);

    // Nothing saved: after a reload the compliance declaration is still unticked
    await agent.kyc.reload();
    await expect(agent.kyc.declaration).not.toBeChecked();
  });

  test(...tc('TC-KYC-08'), async ({ agent }) => {
    // 1) everything empty. Source of funds / risk profile selects have no blank option (they always
    // hold a value), so only the free-entry fields can be left empty.
    await agent.kyc.nextButton.click({ force: true });
    for (const control of [agent.kyc.annualIncome, agent.kyc.netWorth]) {
      await agent.kyc.expectFieldError(control);
    }

    // 2) negative and non-numeric income / net worth
    await agent.kyc.fill(buildKyc());
    await agent.kyc.upload(validPdf().path);
    for (const bad of ['-1', 'abc']) {
      await agent.kyc.setFinancials(bad, bad);
      await agent.kyc.expectNextBlocked();
      await agent.kyc.expectError(/income|net worth|number|numeric|invalid|positive|amount/i);
      await agent.kyc.expectValueNotSaved(agent.kyc.annualIncome, bad);
      await agent.kyc.fill(buildKyc());
      await agent.kyc.upload(validPdf().path);
    }

    // 3) valid values are accepted
    await agent.kyc.setFinancials('1500000', '8000000');
    await agent.kyc.nextStep();
    await agent.kyc.expectNoErrors();
  });

  test(...tc('TC-KYC-09'), async ({ agent }) => {
    appGap('ID issue/expiry dates are only checked with after_or_equal');
    const invalidCases = [
      { name: 'expiry date in the past', issue: idDates.pastExpiry.issue, expiry: idDates.pastExpiry.expiry },
      { name: 'expiry earlier than issue', issue: idDates.expiryBeforeIssue.issue, expiry: idDates.expiryBeforeIssue.expiry },
      { name: 'issue date in the future', issue: idDates.futureIssue, expiry: idDates.futureIssueExpiry },
    ];

    await agent.kyc.fill(buildKyc());
    await agent.kyc.upload(validPdf().path);
    for (const c of invalidCases) {
      await agent.kyc.fillDates(c.issue, c.expiry);
      await agent.kyc.expectNextBlocked();
      await agent.kyc.expectError(/expir|issue|date|invalid/i);
      await agent.kyc.expectValueNotSaved(agent.kyc.expiryDate, c.expiry);
      await agent.kyc.fill(buildKyc());
      await agent.kyc.upload(validPdf().path);
    }

    // Valid dates are accepted
    await agent.kyc.fillDates(idDates.validIssue, idDates.validExpiry);
    await agent.kyc.nextStep();
    await agent.kyc.expectNoErrors();
  });
});
