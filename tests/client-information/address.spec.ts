import { buildAddress } from '../../fixtures/applicationData';
import { invalidZips } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { env } from '../../utils/env';
import { completeClient, startApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test.describe('Address information', () => {
  let applicationId: string;

  test.beforeEach(async ({ agent }) => {
    applicationId = await startApplication(agent);
    await completeClient(agent, applicationId);
    await agent.address.goto(applicationId);
  });

  test(...tc('TC-ADDR-01'), async ({ agent }) => {
    const address = buildAddress();
    await agent.address.fillResidential(address);
    await agent.address.sameAsResidential.check();
    await agent.address.expectMailingCopiedFrom(address);
    await expect(agent.address.mailState).toHaveValue(address.state);

    // Save and reopen: values persist
    await agent.address.fillContact(address);
    await agent.address.nextStep();
    await agent.address.goto(applicationId);
    await agent.address.expectMailingCopiedFrom(address);
  });

  test(...tc('TC-ADDR-02'), async ({ agent }) => {
    const address = buildAddress();
    await agent.address.fillResidential(address);
    await agent.address.sameAsResidential.check();
    await agent.address.sameAsResidential.uncheck();

    // Mailing fields become editable
    await agent.address.expectMailingEditable();
    await agent.address.mailLine1.fill('99 Different Street');

    // Editing residential no longer overwrites the edited mailing value
    await agent.address.resLine1.fill('1 Changed Residential Road');
    await expect(agent.address.mailLine1).toHaveValue('99 Different Street');
  });

  test(...tc('TC-ADDR-03'), async ({ agent }) => {
    for (const zip of invalidZips) {
      await agent.address.fillAll(buildAddress({ postalCode: zip }));
      await agent.address.expectNextBlocked();
      await agent.address.expectError(/zip|postal|pin/i);
      if (zip) await agent.address.expectValueNotSaved(agent.address.resPostal, zip);
    }

    // A valid ZIP is accepted
    await agent.address.fillAll(buildAddress());
    await agent.address.nextStep();
    await agent.address.expectNoErrors();
  });

  test(...tc('TC-ADDR-04'), async ({ agent }) => {
    // 1) state is mandatory
    await agent.address.fillAll(buildAddress());
    await agent.address.clearState();
    await agent.address.expectNextBlocked();
    await agent.address.expectError(/state|required/i);

    // 2) ZIP that belongs to another state (rule to be confirmed - Open Items #19)
    await agent.address.fillAll(buildAddress({ state: 'CA', postalCode: '10001' })); // 10001 = New York ZIP
    await agent.address.nextButton.click().catch(() => undefined);
    const blocked = await agent.address.errors.first().isVisible().catch(() => false);
    if (env.zipStateMismatchRule === 'block') expect(blocked, 'mismatching ZIP/state must be flagged').toBe(true);
    else if (env.zipStateMismatchRule === 'allow') expect(blocked, 'mismatching ZIP/state is allowed by the rule').toBe(false);
    else {
      test.info().annotations.push({
        type: 'observed',
        description: `ZIP/state mismatch ${blocked ? 'was flagged' : 'was accepted'} - set ZIP_STATE_MISMATCH_RULE once confirmed`,
      });
    }
  });
});
