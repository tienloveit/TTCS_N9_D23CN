import assert from 'node:assert/strict';
import test from 'node:test';
import { find, loadPage, textContent } from './componentHarness.mjs';

const SECTION = '../src/pages/Profile/ProfileInfoSection.jsx';
const profile = { fullName: 'Customer', email: 'customer@example.test', phoneNumber: '0901234567',
  dob: '2000-01-15', gender: 'OTHER', role: 'ADMIN', branchId: 7, status: 'ACTIVE', username: 'customer' };

const isButton = (node) => node.type === 'button' || node.type === 'Button';

function mount(page) {
  let current = profile;
  const view = () => page.render({ profile: current, onSaved: (next) => { current = next; } });
  const findButton = (label) => find(view(), (node) => isButton(node) && textContent(node) === label)[0];
  const birthField = () => find(view(), (node) => node.type === 'input' && node.props.type === 'date')[0];
  const submit = () => find(view(), (node) => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  return { view, findButton, birthField, submit };
}

test('profile form displays and submits dob without administrative fields', async () => {
  let payload;
  const page = await loadPage(SECTION, [],
    { userApi: { updateMyInfo: async data => { payload = data; return { data: { result: { ...profile, ...data } } }; } } });
  const { view, findButton, birthField, submit } = mount(page);
  assert.equal(birthField(), undefined);
  assert.match(textContent(view()), /15\/01\/2000/);
  findButton('Sửa thông tin').props.onClick();
  let input = birthField();
  assert.equal(input.props.value, '2000-01-15');
  input.props.onChange({ target: { value: '2001-02-03' } });
  findButton('Hủy').props.onClick();
  assert.equal(birthField(), undefined);
  assert.match(textContent(view()), /15\/01\/2000/);
  assert.equal(payload, undefined);
  findButton('Sửa thông tin').props.onClick();
  input = birthField();
  input.props.onChange({ target: { value: '2001-02-03' } });
  await submit();
  assert.equal(payload.dob, '2001-02-03');
  for (const field of ['birthday', 'role', 'branchId', 'status']) assert.equal(field in payload, false);
  assert.deepEqual(Object.keys(payload).sort(), ['dob', 'email', 'fullName', 'gender', 'phoneNumber']);
  assert.match(textContent(view()), /Đã lưu thông tin cá nhân/);
  assert.match(textContent(view()), /03\/02\/2001/);
});

test('duplicate email or phone shows a Vietnamese message and keeps the form open', async () => {
  const page = await loadPage(SECTION, [], {
    userApi: {
      updateMyInfo: async () => {
        throw { response: { status: 409, data: { code: 409, message: 'A record with the same unique value already exists' } } };
      },
    },
  });
  const { view, findButton, submit } = mount(page);
  findButton('Sửa thông tin').props.onClick();
  await submit();
  const text = textContent(view());
  assert.match(text, /Email hoặc số điện thoại này đã được tài khoản khác dùng/);
  assert.doesNotMatch(text, /unique value/);
  assert.equal(find(view(), (node) => node.type === 'form').length, 1);
  assert.doesNotMatch(text, /Đã lưu thông tin cá nhân/);
});

test('profile submits empty strings for cleared text fields and hides the edit button while editing', async () => {
  let payload;
  const page = await loadPage(SECTION, [], {
    userApi: {
      updateMyInfo: async (data) => {
        payload = data;
        return { data: { result: { ...profile, ...data, email: null, phoneNumber: null } } };
      },
    },
  });
  const { view, findButton, submit } = mount(page);
  const status = () => find(view(), (node) => node.props.role === 'status')[0];
  assert.equal(textContent(status()), '');
  findButton('Sửa thông tin').props.onClick();
  for (const name of ['fullName', 'email', 'phoneNumber']) {
    const [input] = find(view(), (node) => node.type === 'input' && node.props.name === name);
    input.props.onChange({ target: { value: '   ' } });
  }
  assert.equal(findButton('Sửa thông tin'), undefined);
  assert.equal(textContent(status()), '');
  await submit();
  assert.equal(payload.fullName, '');
  assert.equal(payload.email, '');
  assert.equal(payload.phoneNumber, '');
  assert.ok(findButton('Sửa thông tin'));
  assert.equal(textContent(status()), 'Đã lưu thông tin cá nhân.');
  assert.doesNotMatch(textContent(view()), /0901234567/);
});
