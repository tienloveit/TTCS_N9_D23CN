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
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>
        <RefreshIcon size={16} /> Thử lại
      </button>}
    </div>
  );
}

export function StaffSkeleton({ label = 'Đang tải dữ liệu' }) {
  return <div className="staff-skeleton" role="status" aria-label={label}><span /><span /><span /></div>;
}
