import { useEffect, useRef } from 'react';
import { XIcon } from '../../components/Common/CinemaIcons';

/**
 * Khung modal dùng chung cho trang "Vé của tôi":
 * đóng bằng Esc / click nền, khoá cuộn trang khi mở.
 */
export function DialogShell({ onClose, className = '', labelledBy, showClose = true, children }) {
  const closeRef = useRef(onClose);
  const dialogRef = useRef(null);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        closeRef.current?.();
      } else if (event.key === 'Tab') {
        const items = [...dialog.querySelectorAll('button, a[href], input, textarea, select, [tabindex]')]
          .filter((item) => !item.disabled && item.tabIndex >= 0 && item.getClientRects().length);
        const index = items.indexOf(document.activeElement);
        if (!items.length || index === -1 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
          event.preventDefault();
          (items[event.shiftKey ? items.length - 1 : 0] || dialog).focus();
        }
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected && !trigger.disabled) trigger.focus();
      else document.getElementById('mt-page-title')?.focus();
    };
  }, []);

  return (
    <div
      className="mt-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className={`mt-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
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
    <DialogShell onClose={busy ? () => {} : onClose} showClose={!busy} className="mt-dialog--sm" labelledBy="mt-confirm-title">
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

