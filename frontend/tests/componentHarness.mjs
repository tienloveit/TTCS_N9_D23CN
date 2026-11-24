import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithOxc } from 'vite';
import * as cinemaTime from '../src/utils/cinemaTime.js';
import * as paymentStatus from '../src/utils/paymentStatus.js';
import * as bookingStatus from '../src/utils/bookingStatus.js';

// Execute the actual page with lightweight hooks and a JSX tree, without browser I/O.
export async function loadPage(path, initialState, services = {}) {
  const state = [...initialState];
  const notifications = [];
  let cursor = 0;
  const context = vm.createContext({ console, URLSearchParams, Intl });
  const jsx = (type, props) => ({ type, props: props || {} });
  const toast = Object.fromEntries(['success', 'info', 'warn', 'error'].map(level => [level,
    message => notifications.push({ level, message })]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useEffect() {},
    useMemo: compute => compute(),
    useCallback: callback => callback,
    useRef: value => ({ current: value }),
  };
  const icons = ['Award', 'Check', 'Copy', 'Edit', 'Gift', 'Key', 'Spark', 'User',
    'AlertCircle', 'ArrowRight', 'Bell', 'ChevronLeft', 'ChevronRight', 'CreditCard', 'Download', 'Eye', 'EyeOff', 'List', 'Refresh', 'Search', 'Ticket', 'X'];
  const dependencies = {
    react: hooks,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-router-dom': { Link: 'Link', useLocation: () => ({ hash: '#info' }), useNavigate: () => () => {} },
    'react-toastify': { toast },
    '../../api': { bookingApi: {}, branchApi: {}, userApi: {}, authApi: {}, promotionApi: {}, ...services },
    '../../context/useAuth': { useAuth: () => ({ isAdmin: true, isManager: false }) },
    '../../components/Common/Badge': { default: 'Badge' },
    '../../components/Common/ConfirmDialog': { default: 'ConfirmDialog' },
    '../../components/Ops': Object.fromEntries(['Code', 'DataTable', 'Field', 'FilterBar', 'Money', 'OpsButton',
      'OpsConfirm', 'OpsDrawer', 'OpsPage', 'OpsPanel', 'Pagination', 'Select', 'StatStrip', 'StatusBadge',
      'Textarea', 'TextInput'].map(name => [name, name])),
    '../../utils/cinemaTime': { ...cinemaTime },
    '../../utils/paymentStatus': { ...paymentStatus },
    '../../components/Common/Skeleton': { SkeletonBox: 'SkeletonBox' },
    '../../utils/bookingStatus': { ...bookingStatus },
    './ProfilePage.css': {},
    '../../components/Common/CinemaIcons': Object.fromEntries(icons.map(name => [`${name}Icon`, `${name}Icon`])),
  };
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { code } = await transformWithOxc(source, path);
  const module = new vm.SourceTextModule(code, { context });
  await module.link(specifier => {
    const exports = dependencies[specifier];
    if (!exports) throw new Error(`Unexpected page dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return {
    state, notifications,
    render() { cursor = 0; return module.namespace.default(); },
  };
}

export function find(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => find(child, predicate));
  if (!tree || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...['children', 'actions', 'footer'].flatMap(prop => find(tree.props?.[prop], predicate))];
}

export function textContent(tree) {
  if (Array.isArray(tree)) return tree.map(textContent).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? textContent(tree.props?.children) : String(tree);
}
