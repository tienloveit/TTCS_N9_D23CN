import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function loadAuthApi(tokens) {
  const storage = new Map(Object.entries(tokens));
  const posts = [];
  const context = vm.createContext({
    localStorage: { getItem: (key) => storage.get(key) ?? null },
  });
  const client = new vm.SyntheticModule(['default', 'API_BASE_URL'], function () {
    this.setExport('default', {
      post: async (url, data, config) => {
        posts.push({ url, data, config });
        return { data: {} };
      },
    });
    this.setExport('API_BASE_URL', 'http://api.test');
  }, { context });
  const source = await readFile(new URL('../src/api/index.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, { context });
  await module.link(() => client);
  await module.evaluate();
  return { authApi: module.namespace.authApi, posts };
}

test('logout sends both tokens in the body so the backend can end the refresh session', async () => {
  const { authApi, posts } = await loadAuthApi({ accessToken: 'access-1', refreshToken: 'refresh-1' });
  await authApi.logout();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, '/auth/logout');
  assert.deepEqual({ ...posts[0].data }, { accessToken: 'access-1', refreshToken: 'refresh-1' });
});

test('logout never sends a Bearer header or triggers a refresh, even with an expired access token', async () => {
  const { authApi, posts } = await loadAuthApi({ accessToken: 'expired-access', refreshToken: 'refresh-1' });
  await authApi.logout();
  assert.equal(posts[0].config?.skipAuth, true);
  assert.equal(posts[0].config?.headers?.Authorization, undefined);
});
