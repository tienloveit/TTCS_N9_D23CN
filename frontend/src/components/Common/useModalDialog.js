import { useEffect, useId, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Ngăn xếp các dialog đang mở: chỉ dialog trên cùng xử lý Esc/Tab,
// để ConfirmDialog mở chồng lên form không đóng luôn form bên dưới.
const openDialogs = [];

const focusableIn = (node) =>
  node ? [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement) : [];

/**
 * Hành vi chung cho modal dạng `.modal-overlay > .modal-content`:
 * Esc để đóng, giữ Tab trong modal, focus phần tử đầu tiên khi mở và trả focus khi đóng,
 * click nền để đóng (chỉ khi cả nhấn và thả chuột đều trên nền).
 *
 * Dùng: const dialog = useModalDialog(isOpen, close, { disabled: saving });
 * <div className="modal-overlay" {...dialog.overlayProps}>
 *   <div className="modal-content" {...dialog.contentProps}>
 *     <h2 id={dialog.titleId}>...</h2>
 */
export default function useModalDialog(open, onClose, { disabled = false } = {}) {
  const titleId = useId();
  const contentRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(disabled);
  const pressedOnOverlayRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
    disabledRef.current = disabled;
  });

  useEffect(() => {
    if (!open) return undefined;

    const token = {};
    openDialogs.push(token);
    const previousFocus = document.activeElement;

    const node = contentRef.current;
    const preferred = node?.querySelector('[autofocus], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
    (preferred || focusableIn(node)[0] || node)?.focus();

    const handleKeyDown = (event) => {
      if (openDialogs[openDialogs.length - 1] !== token) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!disabledRef.current) onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const items = focusableIn(contentRef.current);
      if (items.length === 0) {
        event.preventDefault();
        contentRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = contentRef.current?.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = openDialogs.indexOf(token);
      if (index >= 0) openDialogs.splice(index, 1);
      if (previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [open]);

  const overlayProps = {
    onMouseDown: (event) => {
      pressedOnOverlayRef.current = event.target === event.currentTarget;
    },
    onClick: (event) => {
      const startedOnOverlay = pressedOnOverlayRef.current;
      pressedOnOverlayRef.current = false;
      if (event.target !== event.currentTarget || !startedOnOverlay) return;
      if (!disabledRef.current) onCloseRef.current?.();
    },
  };

  const contentProps = {
    ref: contentRef,
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    tabIndex: -1,
  };

  return { titleId, overlayProps, contentProps };
}
