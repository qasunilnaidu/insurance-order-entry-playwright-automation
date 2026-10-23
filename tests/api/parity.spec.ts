import { buildBeneficiary, buildClient } from '../../fixtures/applicationData';
import { dobs } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { beneficiaryPayload, clientPayload } from '../../utils/apiPayloads';
import { applicationReadyForRiders, primaryBeneficiaries, startApplication } from '../../utils/testHelpers';
import { tc } from '../../utils/testCase';

test(...tc('TC-API-15'), async ({ agent, api }) => {
  const mismatches: string[] = [];
  const record = (name: string, uiRejected: boolean, apiRejected: boolean): void => {
    if (uiRejected !== apiRejected) mismatches.push(`${name}: UI ${uiRejected ? 'rejects' : 'accepts'}, API ${apiRejected ? 'rejects' : 'accepts'}`);
  };

  // Client DOB cases
  for (const [name, dob] of [['future DOB', dobs.tomorrow], ['underage DOB', dobs.underage]] as const) {
    const uiId = await startApplication(agent);
    await agent.client.goto(uiId);
    await agent.client.fill(buildClient({ dob }));
    const uiRejected = await agent.client.rejectsInput();

    const apiId = await api.createApplication();
    const res = await api.post(`/api/applications/${apiId}/client`, clientPayload(buildClient({ dob })));
    record(name, uiRejected, !res.ok());
  }

  // Allocation 99%
  const uiId = await applicationReadyForRiders(agent);
  await agent.beneficiaries.goto(uiId);
  for (const b of primaryBeneficiaries([60, 39])) await agent.beneficiaries.add(b);
  const uiBlocked = await agent.beneficiaries.rejectsInput();
  const apiId = await api.createApplication();
  for (const a of [60, 39]) await api.post(`/api/applications/${apiId}/beneficiaries`, beneficiaryPayload(buildBeneficiary({ allocation: a })));
  const validate = await api.post(`/api/applications/${apiId}/validate`, {});
  record('allocation 99%', uiBlocked, !validate.ok() || /allocation|100/i.test(JSON.stringify(await api.json(validate))));

  // Minor without guardian
  await agent.beneficiaries.goto(await applicationReadyForRiders(agent));
  await agent.beneficiaries.fillForm(buildBeneficiary({ dob: dobs.minor }));
  await agent.beneficiaries.saveButton.click();
  const uiMinor = await agent.beneficiaries.rejectsInput();
  const minorRes = await api.post(`/api/applications/${await api.createApplication()}/beneficiaries`, beneficiaryPayload(buildBeneficiary({ dob: dobs.minor })));
  record('minor without guardian', uiMinor, !minorRes.ok());

  expect(mismatches, `UI/API rule parity defects:\n${mismatches.join('\n')}`).toEqual([]);
});
