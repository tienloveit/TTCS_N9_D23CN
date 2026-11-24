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
 * Mật khẩu: gập sau nút "Đổi mật khẩu". open do ProfilePage giữ để #password mở sẵn form.
 * 401 "Password incorrect" từ /auth/change-password không kích hoạt refresh hay đăng xuất (xem axiosClient.js).
 */
export default function PasswordSection({ open, onOpenChange }) {
  const [values, setValues] = useState(EMPTY);
  const [visible, setVisible] = useState({});
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const toggleRef = useRef(null);
  const formRef = useRef(null);
  const focusTarget = useRef(null);

  useEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target === 'toggle') toggleRef.current?.focus();
    else if (target) formRef.current?.elements.namedItem(target)?.focus();
  });

  function reset() {
    setValues(EMPTY);
    setVisible({});
    setErrors({});
    setFailure('');
  }

  function openForm() {
    setDone(false);
    focusTarget.current = 'currentPassword';
    onOpenChange(true);
  }

  function closeForm() {
    reset();
    focusTarget.current = 'toggle';
    onOpenChange(false);
  }

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '', ...(name === 'newPassword' && { confirmPassword: '' }) }));
    setFailure('');
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
      focusTarget.current = 'toggle';
      onOpenChange(false);
    } catch (error) {
      const response = error?.response;
      if (response?.status === 401 && response.data?.message === 'Password incorrect') {
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
    <section className="ac-section" aria-labelledby="ac-password-title">
      <div className="ac-section__head">
        <h2 id="ac-password-title" className="ac-section__title" tabIndex={-1}>Mật khẩu</h2>
        {!open && (
          <Button
            variant="secondary"
            ref={toggleRef}
            icon={<KeyIcon size={16} />}
            aria-expanded={false}
            aria-controls="ac-password-form"
            onClick={openForm}
          >
            Đổi mật khẩu
          </Button>
        )}
      </div>

      {!open && <p className="ac-section__lead">Dùng mật khẩu để đăng nhập bằng tên tài khoản.</p>}
      <p className={!open && done ? 'ac-notice' : 'sr-only'} data-tone="success" role="status">
        {!open && done && <><CheckCircleIcon size={18} />Đã đổi mật khẩu.</>}
      </p>

      {open && (
        <form id="ac-password-form" className="ac-form ac-form--narrow" ref={formRef} onSubmit={submit} noValidate aria-busy={saving}>
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
            <Button variant="secondary" onClick={closeForm} disabled={saving}>Hủy</Button>
            <Button variant="primary" type="submit" icon={<KeyIcon size={16} />} disabled={saving}>
              {saving ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
