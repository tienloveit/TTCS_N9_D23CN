import { formatDateTime, parseLocalDateTime } from './bookingFormat.js';

function readHistory(userId) {
  try {
    return JSON.parse(sessionStorage.getItem(`movieptit:booking-history:${userId}`)) || {};
  } catch {
    return {};
  }
}

function saveHistory(userId, history) {
  try {
    sessionStorage.setItem(`movieptit:booking-history:${userId}`, JSON.stringify(history));
  } catch {
    // The bookings list still works when browser storage is unavailable.
  }
}

function getSnapshot(booking) {
  return {
    start: booking.showtimeStart ?? null,
    end: booking.showtimeEnd ?? null,
    venue: [booking.branchName, booking.roomName].filter(Boolean).join(' · '),
    total: booking.totalAmount == null ? null : Number(booking.totalAmount),
  };
}

function changedTime(previous, current) {
  const before = parseLocalDateTime(previous)?.getTime();
  const after = parseLocalDateTime(current)?.getTime();
  return before != null && after != null && before !== after;
}

function describeShowtime(snapshot) {
  const start = formatDateTime(snapshot.start);
  const end = snapshot.end ? ` – ${formatDateTime(snapshot.end)}` : '';
  return [start + end, snapshot.venue].filter(Boolean).join(' · ');
}

export function compareBookingSnapshots(previous, current) {
  const changedSchedule = changedTime(previous.start, current.start)
    || changedTime(previous.end, current.end)
    || (previous.venue && current.venue && previous.venue !== current.venue);
  const changedTotal = Number.isFinite(previous.total) && Number.isFinite(current.total)
    && previous.total !== current.total;

  return {
    ...(changedSchedule && { schedule: { before: describeShowtime(previous), after: describeShowtime(current) } }),
    ...(changedTotal && { total: { before: previous.total, after: current.total } }),
  };
}

export function recordBookingChanges(bookings) {
  const userId = bookings[0]?.userId;
  if (userId == null) return {};
  const { snapshots = {}, notices = {} } = readHistory(userId);
  const nextSnapshots = {};
  const nextNotices = {};

  for (const booking of bookings) {
    const id = booking.bookingId;
    const current = getSnapshot(booking);
    nextSnapshots[id] = current;
    const latest = snapshots[id] ? compareBookingSnapshots(snapshots[id], current) : {};
    const notice = { ...notices[id], ...latest };
    if (Object.keys(notice).length) nextNotices[id] = notice;
  }

  saveHistory(userId, { snapshots: nextSnapshots, notices: nextNotices });
  return nextNotices;
}

export function dismissBookingChange(booking) {
  if (booking.userId == null) return;
  const history = readHistory(booking.userId);
  if (!history.notices?.[booking.bookingId]) return;
  delete history.notices[booking.bookingId];
  saveHistory(booking.userId, history);
}
