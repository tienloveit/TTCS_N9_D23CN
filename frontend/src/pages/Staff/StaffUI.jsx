import Button from '../../components/Common/Button';
import { AlertCircleIcon, RefreshIcon } from '../../components/Common/CinemaIcons';

export function StaffPageHeading({ title, description, icon: Icon, children }) {
  return (
    <header className="staff-page-heading">
      <div className="staff-heading-copy">
        {Icon && <span className="staff-heading-icon"><Icon size={24} /></span>}
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      </div>
      {children && <div className="staff-page-actions">{children}</div>}
    </header>
  );
}

export function StaffState({ title, description, icon: Icon, error, onRetry }) {
  const StateIcon = error ? AlertCircleIcon : Icon;
  return (
    <div className={'staff-state' + (error ? ' staff-state--error' : '')} role={error ? 'alert' : 'status'}>
      {StateIcon && <span className="staff-state-icon"><StateIcon size={22} aria-hidden="true" /></span>}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && <Button icon={<RefreshIcon size={16} />} onClick={onRetry}>Thử lại</Button>}
    </div>
  );
}

export function StaffSkeleton({ label = 'Đang tải dữ liệu' }) {
  return <div className="staff-skeleton" role="status" aria-label={label}><span /><span /><span /></div>;
}

/**
 * Nhóm nút lọc chọn một (bộ lọc khung giờ, trạng thái nhật ký...).
 * - options: [{ key, label }]
 * - label: tên nhóm cho trình đọc màn hình
 */
export function StaffChips({ options, value, onChange, label, className = '' }) {
  return (
    <div className={'staff-chips ' + className} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className="staff-chip"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
