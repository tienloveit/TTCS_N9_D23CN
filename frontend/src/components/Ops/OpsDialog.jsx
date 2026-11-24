import { XIcon } from '../Common/CinemaIcons';
import useModalDialog from '../Common/useModalDialog';
import OpsButton from './OpsButton';

export default function OpsDialog({
  open = true, onClose, title, description, footer, disabled = false, size = 'md', drawer = false,
  children, className = '', ...props
}) {
  const dialog = useModalDialog(Boolean(open), onClose, { disabled });
  if (!open) return null;
  const descriptionId = description ? dialog.titleId + '-description' : undefined;
  return (
    <div className={'o-overlay ' + className} data-drawer={drawer || undefined} {...dialog.overlayProps} {...props}>
      <div className={drawer ? 'o-drawer' : 'o-dialog'} data-size={size} {...dialog.contentProps} aria-describedby={descriptionId}>
        <header className="o-dialog__head">
          <div>
            <h2 id={dialog.titleId}>{title}</h2>
            {description && <p className="o-panel__description" id={descriptionId}>{description}</p>}
          </div>
          <OpsButton variant="ghost" icon={<XIcon size={20} />} aria-label="Đóng" onClick={onClose} disabled={disabled} />
        </header>
        <div className="o-dialog__body">{children}</div>
        {footer && <footer className="o-dialog__foot">{footer}</footer>}
      </div>
    </div>
  );
}
