import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Chạy hook thật với React hook giả và document giả (không cần DOM thật).
async function loadHook() {
  const source = await readFile(new URL('../src/components/Common/useModalDialog.js', import.meta.url), 'utf8');
  const body = source
    .replace(/^import .*$/m, '')
    .replace('export default function useModalDialog', 'function useModalDialog');

  const listeners = new Set();
  const document = {
    activeElement: null,
    addEventListener: (type, fn) => type === 'keydown' && listeners.add(fn),
    removeEventListener: (type, fn) => type === 'keydown' && listeners.delete(fn),
    contains: () => true,
  };
  const press = (key, extra = {}) => {
    const event = { key, shiftKey: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...extra };
    [...listeners].forEach((fn) => fn(event));
    return event;
  };

  let idCounter = 0;
  const context = vm.createContext({ document });
  vm.runInContext(`${body}; globalThis.useModalDialog = useModalDialog;`, Object.assign(context, {
    useId: () => `dialog-${++idCounter}`,
    useRef: (value) => ({ current: value }),
    useEffect: () => {},
  }));

  // Gắn hook vào một "component": giữ ref qua các lần render và chạy effect khi `open` đổi.
  const mount = (onClose, options) => {
    const refs = [];
    let cleanups = [];
    let lastOpen;
    let refIndex = 0;
    let effects = [];
    const render = (open, opts = options) => {
      refIndex = 0;
      effects = [];
      context.useRef = (value) => {
        const index = refIndex++;
        if (!(index in refs)) refs[index] = { current: value };
        return refs[index];
      };
      context.useEffect = (fn, deps) => effects.push({ fn, deps });
      const result = context.useModalDialog(open, onClose, opts);
      result.contentProps.ref.current = { focus() {}, querySelector: () => null, querySelectorAll: () => [], contains: () => true };
      for (const { fn, deps } of effects) {
        if (!deps) { fn(); continue; }
        if (deps[0] === lastOpen) continue;
        cleanups.forEach((c) => c && c());
        cleanups = [fn()];
      }
      lastOpen = open;
      return result;
    };
    const unmount = () => { cleanups.forEach((c) => c && c()); cleanups = []; };
    return { render, unmount };
  };

  return { mount, press, listeners };
}

test('Escape closes only the topmost open dialog', async () => {
  const { mount, press } = await loadHook();
  const closed = [];
  const form = mount(() => closed.push('form'));
  const confirm = mount(() => closed.push('confirm'));
  form.render(true);
  confirm.render(true);

  press('Escape');
  assert.deepEqual(closed, ['confirm']);

  confirm.render(false);
  press('Escape');
  assert.deepEqual(closed, ['confirm', 'form']);
  form.unmount();
});

test('disabled dialogs ignore Escape and backdrop clicks', async () => {
  const { mount, press } = await loadHook();
  let closes = 0;
  const dialog = mount(() => { closes += 1; }, { disabled: true });
  const { overlayProps } = dialog.render(true);

  press('Escape');
  const overlay = {};
  overlayProps.onMouseDown({ target: overlay, currentTarget: overlay });
  overlayProps.onClick({ target: overlay, currentTarget: overlay });
  assert.equal(closes, 0);
  dialog.unmount();
});

test('backdrop closes only when the press also started on the backdrop', async () => {
  const { mount } = await loadHook();
  let closes = 0;
  const dialog = mount(() => { closes += 1; });
  const { overlayProps, contentProps, titleId } = dialog.render(true);
  const overlay = {};
  const input = {};

  // Bôi đen chữ trong form rồi thả chuột ra ngoài nền: không đóng.
  overlayProps.onMouseDown({ target: input, currentTarget: overlay });
  overlayProps.onClick({ target: overlay, currentTarget: overlay });
  assert.equal(closes, 0);

  overlayProps.onMouseDown({ target: overlay, currentTarget: overlay });
  overlayProps.onClick({ target: overlay, currentTarget: overlay });
  assert.equal(closes, 1);

  assert.equal(contentProps.role, 'dialog');
  assert.equal(contentProps['aria-modal'], true);
  assert.equal(contentProps['aria-labelledby'], titleId);
  dialog.unmount();
});

test('closing a dialog removes its keyboard listener', async () => {
  const { mount, listeners } = await loadHook();
  const dialog = mount(() => {});
  dialog.render(true);
  assert.equal(listeners.size, 1);
  dialog.render(false);
  assert.equal(listeners.size, 0);
});
