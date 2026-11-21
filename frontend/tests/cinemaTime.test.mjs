import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDaysToDateKey,
  cinemaTodayKey,
  dateKeyParts,
  formatCinema,
  formatDate,
  formatDateTime,
  formatDayMonth,
  formatShowDate,
  formatTime,
  getCinemaHour,
  getCinemaWeekday,
  parseLocalDateTime,
  toCinemaDateKey,
} from '../src/utils/cinemaTime.js';

// 23:30 giờ rạp ngày 20/11 = 16:30 UTC; máy ở UTC vẫn phải hiển thị giờ rạp.
const LATE_SHOW = '2026-11-20T23:30:00';

test('LocalDateTime is read as cinema time regardless of the machine time zone', () => {
  assert.equal(parseLocalDateTime(LATE_SHOW).toISOString(), '2026-11-20T16:30:00.000Z');
  assert.equal(parseLocalDateTime([2026, 11, 20, 23, 30]).toISOString(), '2026-11-20T16:30:00.000Z');
  assert.equal(parseLocalDateTime('2026-11-20').toISOString(), '2026-11-19T17:00:00.000Z');
  assert.equal(parseLocalDateTime('2026-11-20T16:30:00Z').toISOString(), '2026-11-20T16:30:00.000Z');
  assert.equal(parseLocalDateTime(''), null);
  assert.equal(parseLocalDateTime('not-a-date'), null);
});

test('formatters show cinema wall-clock values', () => {
  assert.equal(formatTime(LATE_SHOW), '23:30');
  assert.equal(formatDate(LATE_SHOW), '20/11/2026');
  assert.equal(formatDayMonth(LATE_SHOW), '20/11');
  assert.equal(formatDateTime(LATE_SHOW), '23:30 20/11/2026');
  assert.equal(formatShowDate(LATE_SHOW), 'T6, 20/11/2026');
  assert.equal(getCinemaHour(LATE_SHOW), 23);
  assert.equal(getCinemaWeekday(LATE_SHOW), 5);
  assert.equal(toCinemaDateKey(LATE_SHOW), '2026-11-20');
  assert.equal(formatCinema(LATE_SHOW, { hour: '2-digit', minute: '2-digit', hour12: false }), '23:30');
  assert.equal(formatTime(null), '—');
  assert.equal(formatCinema(null, {}, '-'), '-');
});

test('today follows the cinema calendar, not the machine calendar', () => {
  // 18:00 UTC ngày 20/11 đã là 01:00 ngày 21/11 tại rạp.
  assert.equal(cinemaTodayKey(new Date('2026-11-20T18:00:00Z')), '2026-11-21');
  assert.equal(cinemaTodayKey(new Date('2026-11-20T16:59:00Z')), '2026-11-20');
});

test('date keys move across month and year boundaries', () => {
  assert.equal(addDaysToDateKey('2026-11-30', 1), '2026-12-01');
  assert.equal(addDaysToDateKey('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysToDateKey('2026-03-01', -1), '2026-02-28');
  assert.deepEqual(dateKeyParts('2026-11-22'), { year: 2026, month: 11, day: 22, weekday: 0, dd: '22', mm: '11' });
});
