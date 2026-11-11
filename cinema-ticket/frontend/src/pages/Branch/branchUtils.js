/**
 * Helpers dùng chung cho khu vực Rạp chiếu (`/branches` và `/branch/:branchId`).
 */

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

/**
 * Tạo danh sách `count` ngày liên tiếp bắt đầu từ hôm nay (theo giờ local, không bị lệch UTC).
 */
export const buildUpcomingDays = (count = 7) => {
  const dayShort = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
  const dayLong = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, idx) => {
    const d = new Date(base);
    d.setDate(base.getDate() + idx);
    const iso = toLocalDateISO(d);
    const dd = pad(d.getDate());
    const mm = pad(d.getMonth() + 1);
    const relativeLabel =
      idx === 0 ? 'Hôm nay' : idx === 1 ? 'Ngày mai' : dayShort[d.getDay()];

    return {
      iso,
      dayNum: dd,
      monthNum: mm,
      shortDay: dayShort[d.getDay()],
      longDay: dayLong[d.getDay()],
      relativeLabel,
      fullLabel: `${idx === 0 ? 'Hôm nay, ' : idx === 1 ? 'Ngày mai, ' : `${dayLong[d.getDay()]}, `}${dd}/${mm}/${d.getFullYear()}`,
      isToday: idx === 0,
    };
  });
};

export const formatRoomType = (roomTechnology) => {
  if (!roomTechnology) return '2D Phụ đề';
  const normalized = String(roomTechnology).toUpperCase().replace(/_/g, ' ').trim();
  if (normalized === '2D') return '2D Standard';
  if (normalized === '3D') return '3D Digital';
  return normalized;
};

export const getAgeBadgeTone = (ageRating) => {
  const code = String(ageRating || '').toUpperCase().trim();
  if (code.includes('18') || code === 'C18') return 'red';
  if (code.includes('16') || code === 'C16') return 'orange';
  if (code.includes('13') || code === 'C13') return 'amber';
  if (code === 'K') return 'blue';
  return 'green'; // P / default
};

