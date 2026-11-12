import assert from 'node:assert/strict';
import test from 'node:test';
import { find, loadPage } from './componentHarness.mjs';

test('profile form displays and submits dob without administrative fields', async () => {
  const profile = { fullName: 'Customer', email: 'customer@example.test', phoneNumber: '0901234567',
    dob: '2000-01-15', gender: 'OTHER', role: 'ADMIN', branchId: 7, status: 'ACTIVE' };
  let payload;
  const page = await loadPage('../src/pages/Profile/ProfilePage.jsx', [profile, false, true, [], ''],
    { userApi: { updateMyInfo: async data => { payload = data; return { data: { result: profile } }; } } });
  const input = find(page.render(), node => node.type === 'input' && node.props.type === 'date')[0];
  assert.equal(input.props.value, '2000-01-15');
  input.props.onChange({ target: { value: '2001-02-03' } });
  await find(page.render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  assert.equal(payload.dob, '2001-02-03');
  for (const field of ['birthday', 'role', 'branchId', 'status']) assert.equal(field in payload, false);
  assert.equal(page.notifications[0].level, 'success');
});
