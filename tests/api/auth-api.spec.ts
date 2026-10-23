import { test, expect } from '../../fixtures/auth.fixture';
import { ApiClient } from '../../utils/apiClient';
import { expectClientError, expectErrorStructure } from '../../utils/assertions';
import { users, WRONG_PASSWORD } from '../../fixtures/users';
import { env } from '../../utils/env';
import { tc } from '../../utils/testCase';

test.describe('Authentication API', () => {
  test(...tc('TC-API-02'), async ({ anonymousApi, api }) => {
    const id = await api.createApplication();
    const invalid = await ApiClient.create({ token: 'invalid.expired.token' });
    try {
      for (const client of [anonymousApi, invalid]) {
        for (const res of [
          await client.get('/api/applications'),
          await client.get(`/api/applications/${id}/client`),
          await client.get(`/api/applications/${id}/status`),
          await client.post(`/api/applications/${id}/submit`, {}),
        ]) {
          expect([401, 403], `${res.url()} must be protected`).toContain(res.status());
          expect(await res.text()).not.toContain(id);
        }
      }
    } finally {
      await invalid.dispose();
    }
  });

  test(...tc('TC-API-09'), async ({ anonymousApi }) => {
    const wrong = await anonymousApi.login({ username: users.valid.username, password: WRONG_PASSWORD });
    const unknown = await anonymousApi.login({ username: 'no.such.agent', password: WRONG_PASSWORD });
    expect(wrong.status()).toBe(401);
    expect(unknown.status()).toBe(401);
    const a = await anonymousApi.json(wrong);
    const b = await anonymousApi.json(unknown);
    expectErrorStructure(a);
    expect(Object.keys(a as object).sort(), 'consistent error structure').toEqual(Object.keys(b as object).sort());
    expectClientError(wrong.status());

    const ok = await anonymousApi.login({ username: env.validUser, password: env.validPass });
    expect(ok.status()).toBe(200);
  });
});
