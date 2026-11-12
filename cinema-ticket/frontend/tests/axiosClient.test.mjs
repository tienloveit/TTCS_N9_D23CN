import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import axios from 'axios';

async function loadClient() {
  const storage = new Map([['accessToken', 'old-access'], ['refreshToken', 'old-refresh']]);
  const window = { location: { href: '/' } };
  const context = vm.createContext({
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    window,
  });
  const dependency = new vm.SyntheticModule(['default'], function () {
    this.setExport('default', axios);
  }, { context });
  const source = await readFile(new URL('../src/api/axiosClient.js', import.meta.url), 'utf8');
  const module = new vm.SourceTextModule(source, {
    context,
    initializeImportMeta: (meta) => { meta.env = {}; },
  });
  await module.link(() => dependency);
  await module.evaluate();
  const client = module.namespace.default;
  const retried = [];
  client.defaults.adapter = async (config) => {
    retried.push(config.headers.Authorization);
    return { status: 200, data: {}, headers: {}, config };
  };
  const rejectExpired = () => client.interceptors.response.handlers[0].rejected({
    response: { status: 401 },
    config: { url: '/my-info', headers: { Authorization: 'Bearer old-access' } },
  });
  return { client, storage, window, rejectExpired, retried };
}

test('concurrent 401 responses share one refresh and both retry with the new access token', async () => {
  const fixture = await loadClient();
  const previousAdapter = axios.defaults.adapter;
  let release;
  const ready = new Promise((resolve) => { release = resolve; });
  let refreshCalls = 0;
  axios.defaults.adapter = async (config) => {
    refreshCalls++;
    assert.equal(JSON.parse(config.data).refreshToken, 'old-refresh');
    await ready;
    return { status: 200, data: { result: { accessToken: 'new-access', refreshToken: 'new-refresh' } }, headers: {}, config };
  };
  try {
    const first = fixture.rejectExpired();
    const second = fixture.rejectExpired();
    const countBeforeCompletion = refreshCalls;
    release();
    await Promise.all([first, second]);
    assert.equal(countBeforeCompletion, 1);
    assert.deepEqual(fixture.retried, ['Bearer new-access', 'Bearer new-access']);
    assert.equal(fixture.storage.get('refreshToken'), 'new-refresh');
    assert.equal(fixture.window.location.href, '/');
  } finally {
    release();
    axios.defaults.adapter = previousAdapter;
  }
});

test('a late 401 for the old access token reuses the already refreshed token', async () => {
  const fixture = await loadClient();
  const previousAdapter = axios.defaults.adapter;
  let refreshCalls = 0;
  axios.defaults.adapter = async (config) => {
    refreshCalls++;
    return { status: 200, data: { result: { accessToken: 'new-access', refreshToken: 'new-refresh' } }, headers: {}, config };
  };
  try {
    await fixture.rejectExpired();
    await fixture.rejectExpired();
    assert.equal(refreshCalls, 1);
    assert.deepEqual(fixture.retried, ['Bearer new-access', 'Bearer new-access']);
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});

test('refresh failure rejects waiting requests, clears credentials and redirects to login', async () => {
  const fixture = await loadClient();
  const previousAdapter = axios.defaults.adapter;
  let refreshCalls = 0;
  axios.defaults.adapter = async () => {
    refreshCalls++;
    throw new Error('Refresh token expired');
  };
  try {
    const results = await Promise.allSettled([fixture.rejectExpired(), fixture.rejectExpired()]);
    assert.equal(refreshCalls, 1);
    assert.ok(results.every((result) => result.status === 'rejected'));
    assert.equal(fixture.storage.size, 0);
    assert.equal(fixture.window.location.href, '/login');
    assert.deepEqual(fixture.retried, []);
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});
