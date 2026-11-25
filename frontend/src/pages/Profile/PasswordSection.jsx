import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api';
import Button from '../../components/Common/Button';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
} from '../../components/Common/CinemaIcons';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };
const FIELDS = [
  { name: 'currentPassword', label: 'Mật khẩu hiện tại', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Mật khẩu mới', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Xác nhận mật khẩu mới', autoComplete: 'new-password' },
];
export const CURRENT_PASSWORD_ID = 'ac-pw-currentPassword';

function validate(values) {
  const errors = {};
  if (!values.currentPassword) errors.currentPassword = 'Nhập mật khẩu hiện tại.';
  if (values.newPassword.length < 6) errors.newPassword = 'Mật khẩu mới cần ít nhất 6 ký tự.';
  else if (values.newPassword === values.currentPassword) errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  if (!values.confirmPassword) errors.confirmPassword = 'Nhập lại mật khẩu mới.';
  else if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  return errors;
}

/**
 * Ngăn Mật khẩu: form luôn hiện. Đổi thành công thì xóa ba ô và focus tiêu đề ngăn.
 * 401 "Password incorrect" từ /auth/change-password không kích hoạt refresh hay đăng xuất (xem axiosClient.js).
 */
export default function PasswordSection() {
  const [values, setValues] = useState(EMPTY);
  const [visible, setVisible] = useState({});
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const formRef = useRef(null);
  const focusTarget = useRef(null);

  useEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    // Không để focus trên nút submit đang disabled, trình duyệt sẽ đẩy focus về body.
    if (target === 'title') document.getElementById('ac-password-title')?.focus();
    else if (target) formRef.current?.elements.namedItem(target)?.focus();
  });

  function reset() {
    setValues(EMPTY);
    setVisible({});
    setErrors({});
    setFailure('');
  }

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '', ...(name === 'newPassword' && { confirmPassword: '' }) }));
    setFailure('');
    setDone(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFailure('');
    const invalid = FIELDS.find((field) => nextErrors[field.name]);
    if (invalid) {
      formRef.current?.elements.namedItem(invalid.name)?.focus();
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      reset();
      setDone(true);
      focusTarget.current = 'title';
    } catch (error) {
      const response = error?.response;
      if (response?.status === 400 && response.data?.message === 'Password incorrect') {
        setErrors({ currentPassword: 'Mật khẩu hiện tại không đúng.' });
        focusTarget.current = 'currentPassword';
      } else {
        setFailure('Không đổi được mật khẩu. Thử lại sau ít phút.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ac-password-panel">
      <div className="ac-panel__head">
        <h2 id="ac-password-title" className="ac-panel__title" tabIndex={-1}>Mật khẩu</h2>
      </div>
      <p className="ac-panel__lead">Dùng khi đăng nhập bằng tên tài khoản.</p>
      <p className={done ? 'ac-notice' : 'sr-only'} data-tone="success" role="status">
        {done && <><CheckCircleIcon size={18} />Đã đổi mật khẩu.</>}
      </p>

      <form className="ac-form ac-form--narrow" ref={formRef} onSubmit={submit} noValidate aria-busy={saving}>
        {failure && (
          <p className="ac-notice" data-tone="danger" role="alert">
            <AlertCircleIcon size={18} />{failure}
          </p>
        )}
        {FIELDS.map(({ name, label, autoComplete }) => {
          const id = `ac-pw-${name}`;
          const errorId = errors[name] ? `${id}-error` : null;
          const hintId = name === 'newPassword' ? `${id}-hint` : null;
          const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
          return (
            <div className="ac-field" key={name}>
              <label className="ac-field__label" htmlFor={id}>{label}</label>
              <div className="ac-password">
                <input
                  id={id}
                  name={name}
                  className="ac-input ac-password__input"
                  type={visible[name] ? 'text' : 'password'}
                  autoComplete={autoComplete}
                  value={values[name]}
                  readOnly={saving}
                  aria-invalid={errorId ? true : undefined}
                  aria-describedby={describedBy}
                  onChange={(event) => update(name, event.target.value)}
                />
                <button
                  type="button"
                  className="ac-password__toggle"
                  aria-label={`Hiện ${label.toLowerCase()}`}
                  aria-pressed={Boolean(visible[name])}
                  onClick={() => setVisible((current) => ({ ...current, [name]: !current[name] }))}
                >
                  {visible[name] ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              {hintId && <p className="ac-field__hint" id={hintId}>Ít nhất 6 ký tự.</p>}
              {errorId && <p className="ac-field__error" id={errorId}>{errors[name]}</p>}
            </div>
          );
        })}
        <p className="ac-form__note">
          Không nhớ mật khẩu hiện tại, hoặc bạn đăng nhập bằng Google? Đặt mật khẩu mới qua email ở trang{' '}
          <Link to="/forgot-password" className="ac-link">Quên mật khẩu</Link>.
        </p>
        <div className="ac-form__actions">
          <Button variant="primary" type="submit" icon={<KeyIcon size={16} />} disabled={saving}>
            {saving ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}
          </Button>
        </div>
      </form>
    </section>
  );
}
