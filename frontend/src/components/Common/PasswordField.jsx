import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './CinemaIcons';

/**
 * Ô mật khẩu có nút hiện/ẩn, dùng chung cho đăng nhập, đăng ký và quên mật khẩu.
 * - label: nhãn hiển thị, được liên kết với ô nhập qua htmlFor/id
 * - toggleLabel: tên đối tượng trong tên nút, ví dụ "mật khẩu xác nhận"
 * Các prop còn lại (value, onChange, name, required, minLength, autoComplete...) truyền thẳng vào <input>.
 */
export default function PasswordField({ label, id, toggleLabel = 'mật khẩu', className = 'form-group', ...inputProps }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label className="form-label" htmlFor={inputId}>{label}</label>
      <div className="auth-input-wrap">
        <input
          {...inputProps}
          id={inputId}
          className="input auth-input-with-toggle"
          type={visible ? 'text' : 'password'}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${toggleLabel}`}
          aria-pressed={visible}
          aria-controls={inputId}
        >
          {visible ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
        </button>
      </div>
    </div>
  );
}
