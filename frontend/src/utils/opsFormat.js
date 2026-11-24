import { addDaysToDateKey, cinemaTodayKey, formatShowDate, toCinemaDateKey } from './cinemaTime.js';

const amountFormat = new Intl.NumberFormat('vi-VN');

export function formatMoney(value) {
  if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) return '—';
  const amount = Number(value);
  return (amount < 0 ? '−' : '') + amountFormat.format(Math.abs(amount)) + ' đ';
}

export function formatDateLabel(value, now = new Date()) {
  const key = toCinemaDateKey(value);
  if (!key) return '—';
  const today = cinemaTodayKey(now);
  if (key === today) return 'Hôm nay';
  if (key === addDaysToDateKey(today, 1)) return 'Ngày mai';
  return formatShowDate(value).replace(/\/\d{4}$/, '');
}
