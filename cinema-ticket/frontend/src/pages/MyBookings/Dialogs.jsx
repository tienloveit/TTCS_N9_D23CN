import { useEffect, useRef } from 'react';
import { XIcon } from '../../components/Common/CinemaIcons';

/**
 * Khung modal dùng chung cho trang "Vé của tôi":
 * đóng bằng Esc / click nền, khoá cuộn trang khi mở.
 */
export function DialogShell({ onClose, className = '', labelledBy, showClose = true, children }) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') closeRef.current?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="mt-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`mt-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {showClose && (
          <button type="button" className="mt-dialog-close" onClick={onClose} aria-label="Đóng">
            <XIcon size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Quay lại',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  return (
    <DialogShell onClose={busy ? () => {} : onClose} className="mt-dialog--sm" labelledBy="mt-confirm-title">
      <h3 id="mt-confirm-title" className="mt-dialog-title">{title}</h3>
      {message && <p className="mt-dialog-text">{message}</p>}
      <div className="mt-dialog-actions">
        <button type="button" className="mt-btn mt-btn--outline" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`mt-btn ${danger ? 'mt-btn--danger' : 'mt-btn--primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Đang xử lý...' : confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}

