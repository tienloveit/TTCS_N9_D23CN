import { AlertTriangleIcon, XIcon } from './CinemaIcons';

/**
 * Reusable accessible confirmation modal to replace native browser window.confirm()
 */
const ConfirmDialog = ({
  open,
  title = 'Xác nhận thao tác',
  message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="modal-overlay"
      onClick={loading ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="modal-content admin-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 460,
          height: 'auto',
          aspectRatio: 'unset',
          padding: 28,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-card)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: isDanger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.14)',
                color: isDanger ? '#dc2626' : '#d97706',
              }}
            >
              <AlertTriangleIcon size={20} />
            </div>
            <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800 }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close"
            style={{ position: 'static', width: 32, height: 32 }}
            onClick={onCancel}
            disabled={loading}
            aria-label="Đóng"
          >
            <XIcon size={16} />
          </button>
        </div>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
            margin: '0 0 22px',
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={
              isDanger
                ? { background: '#dc2626', borderColor: '#dc2626', color: '#fff' }
                : undefined
            }
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

