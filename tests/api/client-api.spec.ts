import { buildClient } from '../../fixtures/applicationData';
import { dobs, SYNTHETIC_SSN } from '../../fixtures/testData';
import { test, expect } from '../../fixtures/auth.fixture';
import { clientPayload } from '../../utils/apiPayloads';
import { expectClientError, expectErrorStructure } from '../../utils/assertions';
import { completeAddress, completeClient, completeKyc, startApplication } from '../../utils/testHelpers';
import { buildKyc } from '../../fixtures/applicationData';
import { tc } from '../../utils/testCase';

test.describe('Client API', () => {
  test(...tc('TC-API-03'), async ({ api }) => {
    const id = await api.createApplication();
    for (const dob of [dobs.tomorrow, dobs.underage]) {
      const res = await api.post(`/api/applications/${id}/client`, clientPayload(buildClient({ dob })));
      expectClientError(res.status());
      expectErrorStructure(await api.json(res));
    }
    const { body } = await api.getJson(`/api/applications/${id}/client`);
    expect(JSON.stringify(body)).not.toContain(dobs.tomorrow);
    expect(JSON.stringify(body)).not.toContain(dobs.underage);
  });

  test(...tc('TC-API-13'), async ({ api }) => {
    const id = await api.createApplication();
    const res = await api.post(`/api/applications/${id}/client`, {});
    expectClientError(res.status());
    const body = await api.json(res);
    expectErrorStructure(body);
    expect(JSON.stringify(body)).toMatch(/first.?name|last.?name|dob|date/i);

    const client = buildClient();
    const ok = await api.post(`/api/applications/${id}/client`, clientPayload(client));
    expect(ok.ok(), `valid client POST returned ${ok.status()}`).toBe(true);
    const read = await api.getJson(`/api/applications/${id}/client`);
    expect(read.status).toBe(200);
    expect(JSON.stringify(read.body)).toContain(client.firstName);
    expect(JSON.stringify(read.body)).toContain(client.lastName);
    expect(JSON.stringify(read.body)).toContain(client.dob);
  });

  test(...tc('TC-KYC-07'), async ({ agent, api }) => {
    const id = await startApplication(agent);
    await completeClient(agent, id);
    await completeAddress(agent, id);
    await completeKyc(agent, id, buildKyc({ idType: 'SSN', idNumber: SYNTHETIC_SSN }));

    const { status, body } = await api.getJson(`/api/applications/${id}/client`);
    expect(status).toBe(200);
    const json = JSON.stringify(body);
    expect(json).not.toContain(SYNTHETIC_SSN);
    expect(json).not.toContain(SYNTHETIC_SSN.replace(/-/g, ''));
  });
});
