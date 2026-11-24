// Ba ngăn của trang Tài khoản, đồng bộ với hash URL. Footer liên kết tới #promos.
export const ACCOUNT_TABS = [
  { id: 'promos', label: 'Ưu đãi' },
  { id: 'info', label: 'Hồ sơ' },
  { id: 'password', label: 'Mật khẩu' },
];
export const DEFAULT_TAB = 'promos';
const IDS = ACCOUNT_TABS.map((tab) => tab.id);

const stripHash = (hash) => String(hash ?? '').replace(/^#/, '');

/** "#info" hoặc "info" → "info". Hash rỗng hoặc lạ → tab mặc định. */
export function tabFromHash(hash) {
  const id = stripHash(hash);
  return IDS.includes(id) ? id : DEFAULT_TAB;
}

/** true khi hash trỏ đúng một tab (dùng để quyết định có cuộn tới vùng tài khoản hay không). */
export function isTabHash(hash) {
  return IDS.includes(stripHash(hash));
}

/** Vị trí tab đích khi bấm phím trong tablist, null nếu phím không thuộc mẫu ARIA. Vòng tròn ở hai đầu. */
export function tabKeyTarget(index, key, count) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
