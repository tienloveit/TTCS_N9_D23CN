import { useEffect, useRef, useState } from 'react';
import { userApi } from '../../api';
import Button from '../../components/Common/Button';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  EditIcon,
  LockIcon,
} from '../../components/Common/CinemaIcons';
import { cinemaTodayKey, formatDate, toCinemaDateKey } from '../../utils/cinemaTime';

const GENDERS = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
// Mã của ErrorCode.DUPLICATE_VALUE trong backend/src/main/java/com/ltweb/backend/exception/ErrorCode.java.
const DUPLICATE_VALUE_CODE = 409;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDITABLE = ['fullName', 'email', 'phoneNumber', 'dob', 'gender'];

/** Câu lỗi tiếng Việt cho lần lưu hồ sơ thất bại; không hiện message tiếng Anh của backend. */
function profileSaveError(error) {
  const response = error?.response;
  if (!response) return 'Không lưu được vì mất kết nối. Kiểm tra mạng rồi bấm Lưu thay đổi.';
  if (response.data?.code === DUPLICATE_VALUE_CODE || response.status === 409) {
    return 'Email hoặc số điện thoại này đã được tài khoản khác dùng. Kiểm tra lại rồi lưu.';
  }
  if (response.status === 400) {
    return 'Thông tin chưa hợp lệ. Kiểm tra email, số điện thoại và ngày sinh rồi lưu.';
  }
  return 'Không lưu được thông tin. Thử lại sau ít phút.';
}

function toDraft(profile) {
  return {
    fullName: profile.fullName ?? '',
    email: profile.email ?? '',
    phoneNumber: profile.phoneNumber ?? '',
    dob: profile.dob ? toCinemaDateKey(profile.dob) : '',
    gender: profile.gender || '',
  };
}

function validate(draft, profile) {
  const errors = {};
  const email = draft.email.trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Email chưa đúng định dạng, ví dụ ten@example.com.';
  if (profile.dob && !draft.dob) errors.dob = 'Chọn ngày sinh. Ngày sinh đã lưu không xóa được.';
  else if (draft.dob && draft.dob > cinemaTodayKey()) errors.dob = 'Ngày sinh không được sau hôm nay.';
  return errors;
}

/** Thông tin cá nhân: dạng đọc, bấm "Sửa thông tin" mới thành form. */
export default function ProfileInfoSection({ profile, onSaved }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});
  const editButton = useRef(null);
  const nameInput = useRef(null);
  const formRef = useRef(null);
  const focusTarget = useRef(null);
  const editing = draft !== null;
  const success = feedback?.error ? '' : feedback?.text ?? '';

  useEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target === 'edit') editButton.current?.focus();
    else if (target === 'name') nameInput.current?.focus();
    else if (target) formRef.current?.elements.namedItem(target)?.focus();
  });

  function startEdit() {
    setFeedback(null);
    setErrors({});
    focusTarget.current = 'name';
    setDraft(toDraft(profile));
  }

  function cancelEdit() {
    setFeedback(null);
    setErrors({});
    focusTarget.current = 'edit';
    setDraft(null);
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setFeedback(null);
  }

  async function save(event) {
    event.preventDefault();
    if (!draft || saving) return;
    const nextErrors = validate(draft, profile);
    setErrors(nextErrors);
    setFeedback(null);
    const invalid = EDITABLE.find((key) => nextErrors[key]);
    if (invalid) {
      focusTarget.current = invalid;
      return;
    }

    setSaving(true);
    try {
      const { data } = await userApi.updateMyInfo({
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phoneNumber: draft.phoneNumber.trim(),
        dob: draft.dob || null,
        gender: draft.gender || null,
      });
      if (!data?.result) throw new Error('Missing profile data');
      onSaved(data.result);
      focusTarget.current = 'edit';
      setDraft(null);
      setFeedback({ text: 'Đã lưu thông tin cá nhân.' });
    } catch (error) {
      setFeedback({ error: true, text: profileSaveError(error) });
    } finally {
      setSaving(false);
    }
  }

  function field(name, label, control) {
    const errorId = errors[name] ? `ac-info-${name}-error` : undefined;
    return (
      <div className="ac-field" key={name}>
        <label className="ac-field__label" htmlFor={`ac-info-${name}`}>{label}</label>
        {control({ id: `ac-info-${name}`, name, 'aria-invalid': errorId ? true : undefined, 'aria-describedby': errorId })}
        {errorId && <p className="ac-field__error" id={errorId}>{errors[name]}</p>}
      </div>
    );
  }

  const textInput = (key, extra) => (props) => (
    <input
      {...props}
      {...extra}
      className="ac-input"
      value={draft[key]}
      readOnly={saving}
      onChange={(event) => updateDraft(key, event.target.value)}
    />
  );

  const details = [
    ['Họ và tên', profile.fullName],
    ['Email', profile.email],
    ['Số điện thoại', profile.phoneNumber],
    ['Ngày sinh', profile.dob ? formatDate(profile.dob) : null],
    ['Giới tính', GENDERS[profile.gender] ?? profile.gender],
  ];

  return (
    <section className="ac-section" aria-labelledby="ac-info-title">
      <div className="ac-section__head">
        <h2 id="ac-info-title" className="ac-section__title" tabIndex={-1}>Thông tin cá nhân</h2>
        {!editing && (
          <Button variant="secondary" ref={editButton} icon={<EditIcon size={16} />} onClick={startEdit}>
            Sửa thông tin
          </Button>
        )}
      </div>

      <p className={success ? 'ac-notice' : 'sr-only'} data-tone="success" role="status">
        {success && <><CheckCircleIcon size={18} />{success}</>}
      </p>

      {editing ? (
        <form className="ac-form" ref={formRef} onSubmit={save} noValidate aria-busy={saving}>
          {feedback?.error && (
            <p className="ac-notice" data-tone="danger" role="alert">
              <AlertCircleIcon size={18} />{feedback.text}
            </p>
          )}
          <div className="ac-form__grid">
            {field('fullName', 'Họ và tên', (props) => (
              <input
                {...props}
                ref={nameInput}
                className="ac-input"
                autoComplete="name"
                maxLength={255}
                value={draft.fullName}
                readOnly={saving}
                onChange={(event) => updateDraft('fullName', event.target.value)}
              />
            ))}
            {field('email', 'Email', textInput('email', { type: 'email', autoComplete: 'email', maxLength: 255 }))}
            {field('phoneNumber', 'Số điện thoại', textInput('phoneNumber', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', maxLength: 20 }))}
            {field('dob', 'Ngày sinh', textInput('dob', { type: 'date', autoComplete: 'bday', max: cinemaTodayKey(), required: Boolean(profile.dob) }))}
            {field('gender', 'Giới tính', (props) => (
              <select
                {...props}
                className="ac-input"
                value={draft.gender}
                disabled={saving}
                onChange={(event) => updateDraft('gender', event.target.value)}
              >
                <option value="" disabled={Boolean(profile.gender)}>Chưa cập nhật</option>
                {Object.entries(GENDERS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            ))}
            <div className="ac-field">
              <span className="ac-field__label">Tên đăng nhập</span>
              <p className="ac-field__static">
                <LockIcon size={16} />{profile.username}<span className="ac-field__hint">Không đổi được</span>
              </p>
            </div>
          </div>
          <div className="ac-form__actions">
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>Hủy</Button>
            <Button variant="primary" type="submit" icon={<CheckIcon size={16} />} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      ) : (
        <dl className="ac-details">
          {details.map(([label, value]) => (
            <div className="ac-details__row" key={label}>
              <dt>{label}</dt>
              <dd data-empty={value ? undefined : 'true'}>{value || 'Chưa cập nhật'}</dd>
            </div>
          ))}
          <div className="ac-details__row">
            <dt>Tên đăng nhập</dt>
            <dd>
              <span className="ac-details__locked"><LockIcon size={16} />{profile.username}</span>
              <span className="ac-field__hint">Không đổi được</span>
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
