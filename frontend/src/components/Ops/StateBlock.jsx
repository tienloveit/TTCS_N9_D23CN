import { isValidElement } from 'react';
import { AlertCircleIcon, ListIcon } from '../Common/CinemaIcons';
import OpsButton from './OpsButton';

export default function StateBlock({
  state = 'empty', title, description, action, onRetry, icon: Icon,
  className = '', ...props
}) {
  if (state === 'loading') {
    return <div className={'o-state o-state--loading ' + className} role="status" aria-label={title || 'Đang tải dữ liệu'} {...props}>
      <span className="o-skeleton" /><span className="o-skeleton" /><span className="o-skeleton" />
    </div>;
  }
  const isError = state === 'error';
  const StateIcon = Icon || (isError ? AlertCircleIcon : ListIcon);
  return (
    <div className={'o-state ' + className} data-state={state} role={isError ? 'alert' : undefined} {...props}>
      <StateIcon size={24} />
      <div>
        <strong>{title ?? (isError ? 'Không thể tải dữ liệu' : 'Chưa có dữ liệu')}</strong>
        {description && <p>{description}</p>}
      </div>
      {onRetry && isError && <OpsButton onClick={onRetry}>Thử lại</OpsButton>}
      {action && (isValidElement(action) ? action : <OpsButton to={action.to} onClick={action.onClick}>{action.label}</OpsButton>)}
    </div>
  );
}
