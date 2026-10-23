import { buildAddress } from '../../fixtures/applicationData';
import { invalidEmails, invalidPhones } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { completeClient, startApplication } from '../../utils/testHelpers';
import { appGap, tc } from '../../utils/testCase';

test.describe('Contact information', () => {
  let applicationId: string;

  test.beforeEach(async ({ agent }) => {
    applicationId = await startApplication(agent);
    await completeClient(agent, applicationId);
    await agent.address.goto(applicationId);
  });

  test(...tc('TC-ADDR-05'), async ({ agent }) => {
    appGap('email:rfc accepts addresses such as "a@b"');
    for (const email of invalidEmails) {
      await agent.address.fillAll(buildAddress({ email }));
      await agent.address.expectNextBlocked();
      await agent.address.expectError(/email/i);
      await agent.address.expectValueNotSaved(agent.address.email, email);
    }

    // A valid email is accepted
    await agent.address.fillAll(buildAddress());
    await agent.address.nextStep();
    await agent.address.expectNoErrors();
  });

  test(...tc('TC-ADDR-06'), async ({ agent }) => {
    // The 11-digit value is only invalid if the app expects 10 digits (confirm the format - Open Items #19)
    for (const phone of invalidPhones) {
      for (const field of ['mobile', 'alternatePhone'] as const) {
        await agent.address.fillAll(buildAddress({ [field]: phone }));
        await agent.address.expectNextBlocked();
        await agent.address.expectError(/phone|mobile|digits|number|invalid/i);
        await agent.address.expectValueNotSaved(agent.address[field], phone);
      }
    }

    // A valid number is accepted
    await agent.address.fillAll(buildAddress());
    await agent.address.nextStep();
    await agent.address.expectNoErrors();
  });

  test(...tc('TC-ADDR-07'), async ({ agent }) => {
    await agent.address.fillResidential(buildAddress());
    await agent.address.sameAsResidential.check();
    for (const control of [agent.address.email, agent.address.mobile, agent.address.alternatePhone]) {
      await agent.address.typeRaw(control, '');
    }

    await agent.address.expectNextBlocked();
    await agent.address.expectError(/contact|email|phone|mobile|preferred|required/i);

    // Nothing was saved
    await agent.address.reload();
    await expect(agent.address.email).toHaveValue('');
    await expect(agent.address.mobile).toHaveValue('');
  });
});
