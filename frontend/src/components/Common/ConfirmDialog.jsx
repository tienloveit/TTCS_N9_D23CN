import Button from './Button';
import { AlertTriangleIcon, XIcon } from './CinemaIcons';
import useModalDialog from './useModalDialog';

const CONFIRM_VARIANT = {
  danger: 'danger',
  warning: 'primary',
  primary: 'primary',
};

/**
 * Hộp xác nhận thay cho window.confirm(): có Esc, giữ focus và trả focus khi đóng.
 * - variant: danger | warning | primary (màu icon và nút xác nhận)
 * - message: chuỗi hoặc phần tử React
 */
const ConfirmDialog = ({
  open,
  title = 'Xác nhận thao tác',
  message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const dialog = useModalDialog(Boolean(open), onCancel, { disabled: loading });

  if (!open) return null;

  return (
    <div className="modal-overlay" {...dialog.overlayProps}>
      <div className="modal-content confirm-dialog" {...dialog.contentProps}>
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-title">
            <div className={`confirm-dialog-icon confirm-dialog-icon--${variant}`} aria-hidden="true">
              <AlertTriangleIcon size={20} />
            </div>
            <h3 id={dialog.titleId}>{title}</h3>
          </div>
          <button
            type="button"
            className="modal-close modal-close--inline"
            onClick={onCancel}
            disabled={loading}
            aria-label="Đóng"
          >
            <XIcon size={16} />
          </button>
        </div>

        <p className="confirm-dialog-message">{message}</p>

        <div className="confirm-dialog-actions">
          <Button onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={CONFIRM_VARIANT[variant] || 'primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang xử lý...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
