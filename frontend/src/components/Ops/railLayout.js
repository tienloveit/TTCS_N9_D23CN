import { formatTime, parseLocalDateTime, toCinemaDateKey } from '../../utils/cinemaTime.js';

const HOUR = 3_600_000;

export function railRange(date, showtimes) {
  const midnight = parseLocalDateTime(date).getTime();
  let from = midnight + 8 * HOUR;
  let to = midnight + 24 * HOUR;
  for (const show of showtimes) {
    const start = parseLocalDateTime(show.startTime);
    const end = parseLocalDateTime(show.endTime);
    if (!start || !end || end <= start) continue;
    from = Math.min(from, Math.floor(start.getTime() / HOUR) * HOUR);
    to = Math.max(to, Math.ceil(end.getTime() / HOUR) * HOUR);
  }
  return { from, to, hours: (to - from) / HOUR };
}

export function railPosition(show, { from, to }) {
  const start = parseLocalDateTime(show.startTime);
  const end = parseLocalDateTime(show.endTime);
  if (!start || !end || end <= start || to <= from) return null;
  return { startRatio: (start - from) / (to - from), spanRatio: (end - start) / (to - from) };
}

export function railPhase(show, now) {
  if (show.status === 'CANCELLED') return 'cancelled';
  if (show.status === 'CLOSED') return 'closed';
  if (parseLocalDateTime(show.endTime)?.getTime() <= now) return 'past';
  if (parseLocalDateTime(show.startTime)?.getTime() <= now) return 'playing';
  return 'upcoming';
}

export function railSlotTime(ratio, { from, to }) {
  const step = 5 * 60_000;
  const time = new Date(Math.min(to - step, Math.max(from, Math.round((from + ratio * (to - from)) / step) * step)));
  return toCinemaDateKey(time) + 'T' + formatTime(time);
}
