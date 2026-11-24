import OpsButton from './OpsButton';
import OpsDialog from './OpsDialog';

export default function OpsConfirm({
  open, onClose, onCancel, onConfirm, title = 'Xác nhận thao tác', message, children,
  confirmLabel, cancelLabel, confirmText, cancelText, loading, disabled,
  variant, tone = variant ?? 'danger', ...props
}) {
  const close = onClose || onCancel;
  return (
    <OpsDialog open={Boolean(open)} size="sm" title={title} onClose={close} disabled={loading || disabled}
      footer={<>
        <OpsButton onClick={close} disabled={loading || disabled}>{cancelLabel ?? cancelText ?? 'Quay lại'}</OpsButton>
        <OpsButton variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={disabled} loading={loading}>
          {confirmLabel ?? confirmText ?? 'Xác nhận'}
        </OpsButton>
      </>} {...props}>
      {message && <div>{message}</div>}{children}
    </OpsDialog>
  );
}
