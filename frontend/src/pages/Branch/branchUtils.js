/**
 * Helpers dùng chung cho khu vực Rạp chiếu (`/branches` và `/branch/:branchId`).
 */
import { AGE_RATINGS } from '../../utils/ageRatings';

const pad = (n) => String(n).padStart(2, '0');

export const parseLocalDateTime = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, mi = 0, s = 0] = value;
    return new Date(y, m - 1, d, h, mi, s);
  }
  const [datePart, timePart] = String(value).split('T');
  if (!datePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = (timePart || '00:00')
    .split(':')
    .map((part) => Math.floor(Number(part)) || 0);
  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTime = (value) => {
  const d = parseLocalDateTime(value);
  if (!d) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const toLocalDateISO = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const cinemaClock = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export const getCinemaLocalNow = () => cinemaClock.format(new Date()).replace(' ', 'T');

/**
 * Tạo dải ngày theo múi giờ của rạp. offset tính từ hôm nay.
 */
export const buildUpcomingDays = (count = 7, offset = 0, today = getCinemaLocalNow().slice(0, 10)) => {
  const dayShort = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
  const dayLong = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const base = parseLocalDateTime(`${today}T12:00`);

  return Array.from({ length: count }, (_, idx) => {
    const dayOffset = offset + idx;
    const d = new Date(base);
    d.setDate(base.getDate() + dayOffset);
    const iso = toLocalDateISO(d);
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const relativeLabel =
      dayOffset === 0 ? 'Hôm nay' : dayOffset === 1 ? 'Ngày mai' : dayShort[d.getDay()];

    return {
      iso,
      dayNum: dd,
      monthNum: mm,
      shortDay: dayShort[d.getDay()],
      longDay: dayLong[d.getDay()],
      relativeLabel,
      fullLabel: `${dayOffset < 2 ? relativeLabel : dayLong[d.getDay()]}, ${dd}/${mm}/${d.getFullYear()}`,
      isToday: dayOffset === 0,
    };
  });
};

// Phân loại phim theo quy định phổ biến phim tại Việt Nam.
const AGE_RATING_LABELS = Object.fromEntries(AGE_RATINGS.map((rating) => [rating.code, rating.description]));

export const getAgeRatingLabel = (ageRating) => {
  const code = String(ageRating || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return AGE_RATING_LABELS[code] || `Phân loại ${ageRating}`;
};

export const getAgeBadgeTone = (ageRating) => {
  const code = String(ageRating || '').toUpperCase().trim();
  if (code.includes('18') || code === 'C18') return 'red';
  if (code.includes('16') || code === 'C16') return 'orange';
  if (code.includes('13') || code === 'C13') return 'amber';
  if (code === 'K') return 'blue';
  return 'green'; // P / default
};

