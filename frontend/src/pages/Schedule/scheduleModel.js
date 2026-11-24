// Xử lý dữ liệu lịch chiếu của trang khách (/branches). Hàm thuần, test bằng node --test.
// Giờ luôn đọc qua cinemaTime.js nên đúng ở mọi múi giờ máy khách.
import {
  addDaysToDateKey,
  dateKeyParts,
  formatTime,
  getCinemaHour,
  parseLocalDateTime,
} from '../../utils/cinemaTime.js';
import { formatScreening } from '../../utils/cinemaFormats.js';
import { normalizeSearch } from '../../utils/searchText.js';

export const SCHEDULE_DAYS = 14;
export const LOW_SEAT_COUNT = 12;
export const SOON_MINUTES = 30;

export const DAYPARTS = [
  { id: 'all', label: 'Cả ngày' },
  { id: 'morning', label: 'Sáng', range: 'trước 12:00', from: 0, to: 12 },
  { id: 'afternoon', label: 'Chiều', range: 'từ 12:00 đến 16:59', from: 12, to: 17 },
  { id: 'evening', label: 'Tối', range: 'từ 17:00 đến 21:59', from: 17, to: 22 },
  { id: 'late', label: 'Khuya', range: 'từ 22:00', from: 22, to: 24 },
];

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** 14 ngày từ todayKey: { key, weekdayShort, relative, dayNum, monthLabel, fullLabel, shortLabel, title, isToday } */
export function buildScheduleDays(todayKey, count = SCHEDULE_DAYS) {
  const currentYear = dateKeyParts(todayKey).year;
  return Array.from({ length: count }, (_, index) => {
    const key = addDaysToDateKey(todayKey, index);
    const { year, month, day, weekday, dd, mm } = dateKeyParts(key);
    const weekdayShort = WEEKDAY_SHORT[weekday];
    const otherYear = year !== currentYear;
    const relative = index === 0 ? 'Hôm nay' : index === 1 ? 'Ngày mai' : weekdayShort;
    const fullLabel = `${WEEKDAY_LONG[weekday]}, ${dd}/${mm}/${year}`;
    return {
      key,
      weekdayShort,
      relative,
      dayNum: dd,
      monthLabel: index > 0 && day === 1 ? `Tháng ${month}${otherYear ? `/${year}` : ''}` : null,
      fullLabel,
      shortLabel: `${dd}/${mm}`,
      title: otherYear ? fullLabel : `${WEEKDAY_LONG[weekday]}, ${dd}/${mm}`,
      isToday: index === 0,
    };
  });
}

/** Trả về khóa ngày hợp lệ trong dải, ngược lại trả todayKey. */
export function resolveDayParam(value, todayKey, count = SCHEDULE_DAYS) {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) return todayKey;
  // Ngày không có thật (30/02) bị Date.UTC đẩy sang ngày khác, nên so lại với chính nó.
  if (addDaysToDateKey(value, 0) !== value) return todayKey;
  const lastKey = addDaysToDateKey(todayKey, count - 1);
  return value >= todayKey && value <= lastKey ? value : todayKey;
}

const startMs = (slot) => parseLocalDateTime(slot?.startTime)?.getTime() ?? Number.POSITIVE_INFINITY;
const byStart = (a, b) => startMs(a) - startMs(b);
const byName = (a, b) => String(a?.movieName || '').localeCompare(String(b?.movieName || ''), 'vi');

/** Bỏ suất có startTime <= now, bỏ phim không còn suất. Trả { movies, startedCount }. */
export function dropStartedShowtimes(movies, now) {
  const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
  let startedCount = 0;
  const kept = [];
  for (const movie of movies || []) {
    const showtimes = (movie.showtimes || []).filter((slot) => {
      const start = parseLocalDateTime(slot.startTime);
      const started = Boolean(start) && start.getTime() <= nowMs;
      if (started) startedCount += 1;
      return !started;
    });
    if (showtimes.length > 0) kept.push({ ...movie, showtimes });
  }
  return { movies: kept, startedCount };
}

/** { state: 'open' | 'low' | 'soldout' | 'closed', available, label, bookable } theo bảng ở mục 6.6. */
export function getSlotState(slot) {
  const raw = slot?.availableSeats;
  const seats = raw == null || raw === '' ? Number.NaN : Number(raw);
  const hasSeatCount = Number.isFinite(seats) && Number(slot?.totalSeats) > 0;
  const available = hasSeatCount ? seats : null;

  if (slot?.status && slot.status !== 'OPEN') {
    return { state: 'closed', available, label: 'Ngừng bán', bookable: false };
  }
  if (!hasSeatCount) return { state: 'open', available: null, label: 'Đang mở bán', bookable: true };
  if (seats <= 0) return { state: 'soldout', available: 0, label: 'Hết ghế', bookable: false };
  const label = `Còn ${seats} ghế`;
  if (seats <= LOW_SEAT_COUNT) return { state: 'low', available: seats, label, bookable: true };
  return { state: 'open', available: seats, label, bookable: true };
}

/** Số phút tới giờ chiếu, null nếu đã qua hoặc không đọc được giờ. */
export function minutesUntil(slot, now) {
  const start = parseLocalDateTime(slot?.startTime);
  if (!start || !(now instanceof Date)) return null;
  const diff = start.getTime() - now.getTime();
  return diff > 0 ? Math.ceil(diff / 60000) : null;
}

/** Số phút tới giờ chiếu nếu suất thuộc nhóm "sắp chiếu" (trong SOON_MINUTES phút), ngược lại null. */
export function soonMinutes(slot, now) {
  const minutes = minutesUntil(slot, now);
  return minutes != null && minutes <= SOON_MINUTES ? minutes : null;
}

/** Buổi của một suất theo giờ bắt đầu (giờ rạp), null nếu không đọc được giờ. */
export function getDaypart(slot) {
  const hour = getCinemaHour(slot?.startTime);
  if (hour == null) return null;
  return DAYPARTS.find((part) => part.from != null && hour >= part.from && hour < part.to)?.id ?? null;
}

/** Đếm suất theo buổi: { all, morning, afternoon, evening, late }. */
export function countByDaypart(movies) {
  const counts = Object.fromEntries(DAYPARTS.map((part) => [part.id, 0]));
  for (const movie of movies || []) {
    for (const slot of movie.showtimes || []) {
      counts.all += 1;
      const part = getDaypart(slot);
      if (part) counts[part] += 1;
    }
  }
  return counts;
}

/** Lọc theo buổi và từ khóa tên phim (bỏ dấu, không phân biệt hoa thường). */
export function filterSchedule(movies, { daypart = 'all', query = '' } = {}) {
  const needle = normalizeSearch(query);
  const result = [];
  for (const movie of movies || []) {
    if (needle && !normalizeSearch(movie.movieName).includes(needle)) continue;
    const showtimes = daypart === 'all'
      ? movie.showtimes || []
      : (movie.showtimes || []).filter((slot) => getDaypart(slot) === daypart);
    if (showtimes.length > 0) result.push({ ...movie, showtimes });
  }
  return result;
}

const earliestStart = (movie) => Math.min(Number.POSITIVE_INFINITY, ...(movie.showtimes || []).map(startMs));

/** Xếp phim theo giờ suất sớm nhất rồi theo tên. */
export function sortMovies(movies) {
  return [...(movies || [])].sort((a, b) => (earliestStart(a) - earliestStart(b)) || byName(a, b));
}

/** Nhóm suất của một phim theo định dạng: [{ format, showtimes }], xếp theo suất sớm nhất. */
export function groupByFormat(showtimes) {
  const groups = new Map();
  for (const slot of [...(showtimes || [])].sort(byStart)) {
    const format = slotFormat(slot);
    if (!groups.has(format)) groups.set(format, []);
    groups.get(format).push(slot);
  }
  return Array.from(groups, ([format, slots]) => ({ format, showtimes: slots }));
}

/** Trải phẳng thành danh sách suất cho chế độ "Theo giờ": [{ ...slot, movie }]. */
export function toTimeline(movies) {
  const rows = [];
  for (const { showtimes, ...movie } of movies || []) {
    for (const slot of showtimes || []) rows.push({ ...slot, movie });
  }
  return rows.sort((a, b) => byStart(a, b) || byName(a.movie, b.movie));
}

/** Định dạng của một suất ("2D", "3D IMAX"). */
export const slotFormat = (slot) =>
  formatScreening(slot?.screeningFormat || undefined, slot?.roomTechnology || undefined);

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const slotTime = (slot) => (slot?.endTime
  ? `${formatTime(slot.startTime)} đến ${formatTime(slot.endTime)}`
  : formatTime(slot?.startTime));
const finish = (parts, bookable) => {
  const text = parts.filter(Boolean).join(', ');
  return bookable ? `${text}. Chọn ghế` : text;
};

/**
 * Nhãn đọc của cuống vé. Bắt đầu bằng đúng chữ hiển thị theo thứ tự (giờ, phòng hoặc "sau n phút", số ghế)
 * để tên truy cập chứa nhãn nhìn thấy (WCAG 2.5.3), rồi mới tới phần chỉ có trong nhãn.
 * Ví dụ: "19:15 đến 21:13, Phòng 1, còn 8 ghế, 2D. Chọn ghế".
 */
export function slotLabel(slot, { soon = null } = {}) {
  const { label, bookable } = getSlotState(slot);
  const room = slot?.roomName || 'Phòng chiếu';
  return finish([
    slotTime(slot),
    soon != null ? `sau ${soon} phút` : room,
    lowerFirst(label),
    slotFormat(slot),
    soon != null ? room : null,
  ], bookable);
}

/**
 * Nhãn đọc của một dòng bảng giờ, theo thứ tự hiển thị:
 * "18:30, Mai, T13, 2D, Phòng 3, còn 42 ghế, 85.000 đ. Chọn ghế".
 */
export function rowLabel(row, { price = null, soon = null } = {}) {
  const { label, bookable } = getSlotState(row);
  return finish([
    formatTime(row?.startTime),
    row?.movie?.movieName,
    row?.movie?.ageRating,
    slotFormat(row),
    row?.roomName || 'Phòng chiếu',
    soon != null ? `bắt đầu sau ${soon} phút` : null,
    lowerFirst(label),
    bookable ? price : null,
  ], bookable);
}

const daypartPhrase = (daypart) => {
  const part = DAYPARTS.find((item) => item.id === daypart && item.id !== 'all');
  return part ? `buổi ${part.label.toLowerCase()}` : '';
};

/** "6 phim, 22 suất." hoặc "Đang lọc: 2 phim, 5 suất buổi tối." */
export function describeSummary({ movieCount, slotCount, daypart = 'all', query = '' }) {
  const phrase = daypartPhrase(daypart);
  const counts = `${movieCount} phim, ${slotCount} suất${phrase ? ` ${phrase}` : ''}.`;
  return phrase || String(query).trim() ? `Đang lọc: ${counts}` : counts;
}

/** Mô tả bộ lọc đang bật: 'buổi tối và phim "Mai"'. */
export function describeFilter({ daypart = 'all', query = '' } = {}) {
  const keyword = String(query).trim();
  return [daypartPhrase(daypart), keyword && `phim "${keyword}"`].filter(Boolean).join(' và ');
}
