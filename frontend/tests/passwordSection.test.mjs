import assert from 'node:assert/strict';
import test from 'node:test';
import { find, loadPage, textContent } from './componentHarness.mjs';

const SECTION = '../src/pages/Profile/PasswordSection.jsx';

async function mount(changePassword) {
  const page = await loadPage(SECTION, [], { authApi: { changePassword } });
  const view = () => page.render();
  const input = (name) => find(view(), (node) => node.type === 'input' && node.props.name === name)[0];
  const type = (name, value) => input(name).props.onChange({ target: { value } });
  const submit = () => find(view(), (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  return { view, input, type, submit };
}

test('password form is always visible and sends only the current and new password', async () => {
  let payload;
  const { view, input, type, submit } = await mount(async (data) => { payload = data; return { data: {} }; });
  assert.equal(find(view(), (node) => node.type === 'form').length, 1);
  assert.equal(find(view(), (node) => node.type === 'Button' && textContent(node) === 'Hủy').length, 0);
  type('currentPassword', 'old-secret');
  type('newPassword', 'new-secret');
  type('confirmPassword', 'new-secret');
  await submit();
  assert.deepEqual(Object.keys(payload).sort(), ['currentPassword', 'newPassword']);
  assert.equal(payload.currentPassword, 'old-secret');
  assert.equal(payload.newPassword, 'new-secret');
  for (const name of ['currentPassword', 'newPassword', 'confirmPassword']) assert.equal(input(name).props.value, '');
  assert.match(textContent(view()), /Đã đổi mật khẩu\./);
  type('currentPassword', 'x');
  assert.doesNotMatch(textContent(view()), /Đã đổi mật khẩu\./);
});

test('a short new password is rejected before calling the API', async () => {
  let called = false;
  const { view, type, submit } = await mount(async () => { called = true; return { data: {} }; });
  type('currentPassword', 'old-secret');
  type('newPassword', 'short');
  type('confirmPassword', 'short');
  await submit();
  assert.equal(called, false);
  assert.match(textContent(view()), /Mật khẩu mới cần ít nhất 6 ký tự\./);
});

test('a wrong current password shows the error under the field and keeps the input', async () => {
  const { view, input, type, submit } = await mount(async () => {
    throw { response: { status: 400, data: { message: 'Password incorrect' } } };
  });
  type('currentPassword', 'wrong-secret');
  type('newPassword', 'new-secret');
  type('confirmPassword', 'new-secret');
  await submit();
  assert.match(textContent(view()), /Mật khẩu hiện tại không đúng\./);
  assert.equal(input('newPassword').props.value, 'new-secret');
  assert.doesNotMatch(textContent(view()), /Đã đổi mật khẩu\./);
});
