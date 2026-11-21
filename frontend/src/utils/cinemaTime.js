// Thời gian theo giờ rạp (Asia/Ho_Chi_Minh, UTC+07:00).
// Backend trả LocalDateTime không kèm múi giờ, nên mọi chuỗi/mảng thời gian
// được hiểu là giờ rạp, không phụ thuộc múi giờ của máy đang mở trang.
export const CINEMA_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CINEMA_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Chuyển LocalDateTime (chuỗi ISO không múi giờ hoặc mảng Jackson) thành Date. */
export const parseLocalDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, mi = 0, s = 0, nanos = 0] = value;
    const ms = Date.UTC(y, m - 1, d, h, mi, s, Math.floor(nanos / 1e6)) - CINEMA_OFFSET_MS;
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  const text = String(value);
  // Chuỗi đã có múi giờ (Z hoặc ±hh:mm) giữ nguyên ý nghĩa.
  if (/T.*(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const [day, time = '00:00'] = text.split('T');
  const date = new Date(`${day}T${time}+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Date mà các getter UTC trả về đúng thành phần giờ rạp. */
const cinemaParts = (value) => {
  const date = parseLocalDateTime(value);
  return date && new Date(date.getTime() + CINEMA_OFFSET_MS);
};

/** "T2, 20/11/2026" */
export const formatShowDate = (value) => {
  const d = cinemaParts(value);
  if (!d) return '—';
  return `${WEEKDAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

/** "20/11/2026" */
export const formatDate = (value) => {
  const d = cinemaParts(value);
  if (!d) return '—';
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

/** "20/11" */
export const formatDayMonth = (value) => {
  const d = cinemaParts(value);
  if (!d) return '—';
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
};

/** "19:30" */
export const formatTime = (value) => {
  const d = cinemaParts(value);
  if (!d) return '—';
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** "19:30 20/11/2026" */
export const formatDateTime = (value) => {
  const d = cinemaParts(value);
  if (!d) return '—';
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

/** Thứ trong tuần theo giờ rạp, 0 = Chủ nhật. */
export const getCinemaWeekday = (value) => {
  const d = cinemaParts(value);
  return d ? d.getUTCDay() : null;
};

/** Khóa ngày "YYYY-MM-DD" theo giờ rạp, dùng để nhóm/lọc theo ngày. */
export const toCinemaDateKey = (value) => {
  const d = cinemaParts(value);
  if (!d) return '';
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** Giờ (0-23) theo giờ rạp. */
export const getCinemaHour = (value) => {
  const d = cinemaParts(value);
  return d ? d.getUTCHours() : null;
};

/**
 * Định dạng tùy biến bằng Intl, luôn theo giờ rạp.
 * Ví dụ formatCinema(v, { dateStyle: 'short' }) hoặc { weekday: 'long' }.
 */
export const formatCinema = (value, options = {}, fallback = '—') => {
  const date = parseLocalDateTime(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat('vi-VN', { timeZone: CINEMA_TIME_ZONE, ...options }).format(date);
};

/** Ngày hôm nay "YYYY-MM-DD" theo giờ rạp. */
export const cinemaTodayKey = (now = new Date()) => toCinemaDateKey(now);

/** Cộng/trừ số ngày trên khóa "YYYY-MM-DD". */
export const addDaysToDateKey = (key, days) => {
  const [y, m, d] = String(key).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** Thành phần của một khóa ngày: thứ (0 = CN), ngày, tháng, năm. */
export const dateKeyParts = (key) => {
  const [year, month, day] = String(key).split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday, dd: pad(day), mm: pad(month) };
};

/** "08:21" */
export const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
};
