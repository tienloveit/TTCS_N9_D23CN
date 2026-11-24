import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLocalDateTime } from '../src/utils/cinemaTime.js';
import {
  DAYPARTS,
  LOW_SEAT_COUNT,
  SCHEDULE_DAYS,
  buildScheduleDays,
  countByDaypart,
  dropStartedShowtimes,
  filterSchedule,
  getDaypart,
  getSlotState,
  groupByFormat,
  minutesUntil,
  resolveDayParam,
  slotLabel,
  sortMovies,
  toTimeline,
} from '../src/pages/Schedule/scheduleModel.js';
import { normalizeSearch } from '../src/utils/searchText.js';

// Mọi giờ trong test là giờ rạp; `at` dựng Date thật để không phụ thuộc múi giờ máy.
const at = (text) => parseLocalDateTime(text);

const slot = (id, startTime, extra = {}) => ({
  showtimeId: id,
  startTime,
  status: 'OPEN',
  availableSeats: 50,
  totalSeats: 80,
  screeningFormat: 'TWO_D',
  roomTechnology: 'STANDARD',
  roomName: `Phòng ${id}`,
  ...extra,
});

const movie = (movieId, movieName, showtimes) => ({ movieId, movieName, showtimes });

test('buildScheduleDays returns 14 days starting today with relative labels', () => {
  const days = buildScheduleDays('2026-11-25');
  assert.equal(SCHEDULE_DAYS, 14);
  assert.equal(days.length, 14);
  assert.equal(days[0].key, '2026-11-25');
  assert.equal(days[0].relative, 'Hôm nay');
  assert.equal(days[0].isToday, true);
  assert.equal(days[1].relative, 'Ngày mai');
  assert.equal(days[1].isToday, false);
  assert.equal(days[2].key, '2026-11-27');
  assert.equal(days[2].relative, 'T6');
  assert.equal(days[2].weekdayShort, 'T6');
  assert.equal(days[2].dayNum, '27');
  assert.equal(days[2].shortLabel, '27/11');
  assert.equal(days[2].fullLabel, 'Thứ sáu, 27/11/2026');
  assert.equal(days[0].title, 'Thứ tư, 25/11');
  assert.equal(days[4].relative, 'CN');
  assert.equal(days[13].key, '2026-12-08');
});

test('buildScheduleDays marks the first day of a new month only', () => {
  const days = buildScheduleDays('2026-11-25');
  const marked = days.filter((day) => day.monthLabel);
  assert.deepEqual(marked.map((day) => day.key), ['2026-12-01']);
  assert.equal(marked[0].monthLabel, 'Tháng 12');
  assert.equal(days[0].monthLabel, null);
});

test('buildScheduleDays crosses the year and shows the year where it differs', () => {
  const days = buildScheduleDays('2026-12-25');
  const newYear = days.find((day) => day.key === '2027-01-01');
  assert.ok(newYear);
  assert.equal(newYear.monthLabel, 'Tháng 1/2027');
  assert.equal(newYear.fullLabel, 'Thứ sáu, 01/01/2027');
  assert.equal(newYear.title, 'Thứ sáu, 01/01/2027');
  assert.equal(days[0].title, 'Thứ sáu, 25/12');
});

test('resolveDayParam keeps valid days in range and falls back to today', () => {
  const today = '2026-11-25';
  assert.equal(resolveDayParam('2026-11-27', today), '2026-11-27');
  assert.equal(resolveDayParam('2026-11-25', today), today);
  assert.equal(resolveDayParam('2026-12-08', today), '2026-12-08');
  for (const bad of ['', null, undefined, '27/11/2026', '2026-11-5', '2026-02-30', '2026-11-24', '2026-12-09', 'abc']) {
    assert.equal(resolveDayParam(bad, today), today, `value ${bad}`);
  }
});

test('dropStartedShowtimes hides showtimes that already started and empty movies', () => {
  const input = [
    movie(1, 'A', [slot(1, '2026-11-25T19:00:00'), slot(2, '2026-11-25T21:00:00')]),
    movie(2, 'B', [slot(3, '2026-11-25T18:00:00')]),
  ];
  const snapshot = JSON.stringify(input);
  const { movies, startedCount } = dropStartedShowtimes(input, at('2026-11-25T19:00'));
  assert.equal(startedCount, 2);
  assert.deepEqual(movies.map((m) => m.movieId), [1]);
  assert.deepEqual(movies[0].showtimes.map((s) => s.showtimeId), [2]);
  assert.equal(JSON.stringify(input), snapshot, 'input must not be mutated');
});

test('getSlotState follows the seat thresholds', () => {
  assert.equal(LOW_SEAT_COUNT, 12);
  assert.deepEqual(getSlotState(slot(1, 'x', { availableSeats: 0 })), { state: 'soldout', available: 0, label: 'Hết ghế', bookable: false });
  assert.deepEqual(getSlotState(slot(1, 'x', { availableSeats: 1 })), { state: 'low', available: 1, label: 'Còn 1 ghế', bookable: true });
  assert.equal(getSlotState(slot(1, 'x', { availableSeats: 12 })).state, 'low');
  assert.deepEqual(getSlotState(slot(1, 'x', { availableSeats: 13 })), { state: 'open', available: 13, label: 'Còn 13 ghế', bookable: true });
  assert.deepEqual(getSlotState(slot(1, 'x', { availableSeats: 0, totalSeats: 0 })), { state: 'open', available: null, label: 'Đang mở bán', bookable: true });
  assert.deepEqual(getSlotState(slot(1, 'x', { availableSeats: undefined, totalSeats: undefined })), { state: 'open', available: null, label: 'Đang mở bán', bookable: true });
  assert.deepEqual(getSlotState(slot(1, 'x', { status: 'CLOSED' })), { state: 'closed', available: 50, label: 'Ngừng bán', bookable: false });
});

test('dayparts split on the start hour in cinema time', () => {
  assert.deepEqual(DAYPARTS.map((d) => d.id), ['all', 'morning', 'afternoon', 'evening', 'late']);
  assert.equal(getDaypart(slot(1, '2026-11-25T11:59:00')), 'morning');
  assert.equal(getDaypart(slot(1, '2026-11-25T12:00:00')), 'afternoon');
  assert.equal(getDaypart(slot(1, '2026-11-25T16:59:00')), 'afternoon');
  assert.equal(getDaypart(slot(1, '2026-11-25T17:00:00')), 'evening');
  assert.equal(getDaypart(slot(1, '2026-11-25T22:00:00')), 'late');
  assert.equal(getDaypart(slot(1, [2026, 11, 25, 23, 30])), 'late');

  const movies = [
    movie(1, 'A', [slot(1, '2026-11-25T11:59:00'), slot(2, '2026-11-25T12:00:00'), slot(3, '2026-11-25T16:59:00')]),
    movie(2, 'B', [slot(4, '2026-11-25T17:00:00'), slot(5, '2026-11-25T22:00:00')]),
  ];
  assert.deepEqual(countByDaypart(movies), { all: 5, morning: 1, afternoon: 2, evening: 1, late: 1 });
});

test('filterSchedule combines daypart and accent-insensitive title search', () => {
  const movies = [
    movie(1, 'Đào, phở và piano', [slot(1, '2026-11-25T10:00:00'), slot(2, '2026-11-25T19:00:00')]),
    movie(2, 'Dune', [slot(3, '2026-11-25T19:30:00')]),
    movie(3, 'Mai', [slot(4, '2026-11-25T09:00:00')]),
  ];
  const snapshot = JSON.stringify(movies);
  assert.equal(normalizeSearch('  Đào PHỞ '), 'dao pho');
  assert.deepEqual(filterSchedule(movies, { query: 'dao' }).map((m) => m.movieId), [1]);
  assert.deepEqual(filterSchedule(movies, { query: 'DÀO' }).map((m) => m.movieId), [1]);

  const evening = filterSchedule(movies, { daypart: 'evening' });
  assert.deepEqual(evening.map((m) => m.movieId), [1, 2]);
  assert.deepEqual(evening[0].showtimes.map((s) => s.showtimeId), [2]);

  const both = filterSchedule(movies, { daypart: 'morning', query: 'dao' });
  assert.deepEqual(both.map((m) => m.movieId), [1]);
  assert.deepEqual(both[0].showtimes.map((s) => s.showtimeId), [1]);

  assert.deepEqual(filterSchedule(movies, { daypart: 'late' }), []);
  assert.equal(filterSchedule(movies).length, 3);
  assert.equal(JSON.stringify(movies), snapshot, 'input must not be mutated');
});

test('sortMovies puts the earliest remaining showtime first, then name', () => {
  const movies = [
    movie(1, 'Zorro', [slot(1, '2026-11-25T20:00:00')]),
    movie(2, 'Bố già', [slot(2, '2026-11-25T18:00:00')]),
    movie(3, 'An', [slot(3, '2026-11-25T21:00:00'), slot(4, '2026-11-25T18:00:00')]),
  ];
  assert.deepEqual(sortMovies(movies).map((m) => m.movieId), [3, 2, 1]);
  assert.deepEqual(movies.map((m) => m.movieId), [1, 2, 3], 'input must not be mutated');
});

test('toTimeline flattens showtimes by start time, then movie name', () => {
  const movies = [
    movie(1, 'Zorro', [slot(1, '2026-11-25T20:00:00'), slot(2, '2026-11-25T18:00:00')]),
    movie(2, 'An', [slot(3, '2026-11-25T20:00:00')]),
  ];
  const timeline = toTimeline(movies);
  assert.deepEqual(timeline.map((s) => s.showtimeId), [2, 3, 1]);
  assert.equal(timeline[0].movie.movieName, 'Zorro');
  assert.equal(timeline[0].movie.showtimes, undefined);
});

test('groupByFormat orders groups by their earliest showtime', () => {
  const groups = groupByFormat([
    slot(1, '2026-11-25T21:00:00'),
    slot(2, '2026-11-25T18:00:00', { roomTechnology: 'IMAX' }),
    slot(3, '2026-11-25T19:00:00'),
    slot(4, '2026-11-25T20:00:00', { screeningFormat: 'THREE_D', roomTechnology: undefined }),
  ]);
  assert.deepEqual(groups.map((g) => g.format), ['2D IMAX', '2D', '3D']);
  assert.deepEqual(groups[1].showtimes.map((s) => s.showtimeId), [3, 1]);
});

test('minutesUntil counts minutes to start and returns null once started', () => {
  const now = at('2026-11-25T18:35');
  assert.equal(minutesUntil(slot(1, '2026-11-25T19:00:00'), now), 25);
  assert.equal(minutesUntil(slot(1, '2026-11-25T18:35:00'), now), null);
  assert.equal(minutesUntil(slot(1, '2026-11-25T18:00:00'), now), null);
  assert.equal(minutesUntil(slot(1, 'not-a-date'), now), null);
});

test('slotLabel reads the visible stub text first, then format', () => {
  const low = slot(1, '2026-11-25T19:15:00', { endTime: '2026-11-25T21:13:00', roomName: 'Phòng 1', availableSeats: 8 });
  assert.equal(slotLabel(low), '19:15 đến 21:13, Phòng 1, còn 8 ghế, 2D. Chọn ghế');
  assert.equal(slotLabel(low, { soon: 25 }), '19:15 đến 21:13, sau 25 phút, còn 8 ghế, 2D, Phòng 1. Chọn ghế');
  const soldOut = slot(2, '2026-11-25T21:00:00', { roomName: 'Phòng 2', availableSeats: 0 });
  assert.equal(slotLabel(soldOut), '21:00, Phòng 2, hết ghế, 2D');
});

test('getAgeRatingLabel describes known codes and keeps unknown ones', async () => {
  const { getAgeRatingLabel } = await import('../src/utils/ageRatings.js');
  assert.equal(getAgeRatingLabel('t13'), 'Phim dành cho khán giả từ đủ 13 tuổi');
  assert.equal(getAgeRatingLabel('C18'), 'Phân loại C18');
});

test('rowLabel follows the visible order of a time board row', async () => {
  const { rowLabel } = await import('../src/pages/Schedule/scheduleModel.js');
  const row = { ...slot(1, '2026-11-25T18:30:00', { roomName: 'Phòng 3', availableSeats: 42, ticketPrice: 85000 }), movie: { movieName: 'Mai', ageRating: 'T13' } };
  assert.equal(rowLabel(row, { price: '85.000 đ' }), '18:30, Mai, T13, 2D, Phòng 3, còn 42 ghế, 85.000 đ. Chọn ghế');
  assert.equal(rowLabel(row, { price: '85.000 đ', soon: 12 }), '18:30, Mai, T13, 2D, Phòng 3, bắt đầu sau 12 phút, còn 42 ghế, 85.000 đ. Chọn ghế');
  const full = { ...slot(2, '2026-11-25T19:00:00', { roomName: 'Phòng 2', availableSeats: 0 }), movie: { movieName: 'Dune' } };
  assert.equal(rowLabel(full), '19:00, Dune, 2D, Phòng 2, hết ghế');
});

test('describeSummary and describeFilter build the status sentences', async () => {
  const { describeSummary, describeFilter } = await import('../src/pages/Schedule/scheduleModel.js');
  assert.equal(describeSummary({ movieCount: 6, slotCount: 22 }), '6 phim, 22 suất.');
  assert.equal(describeSummary({ movieCount: 2, slotCount: 5, daypart: 'evening' }), 'Đang lọc: 2 phim, 5 suất buổi tối.');
  assert.equal(describeSummary({ movieCount: 1, slotCount: 3, query: 'mai' }), 'Đang lọc: 1 phim, 3 suất.');
  assert.equal(describeFilter({ daypart: 'evening', query: ' Mai ' }), 'buổi tối và phim "Mai"');
  assert.equal(describeFilter({ daypart: 'all', query: 'Mai' }), 'phim "Mai"');
  assert.equal(describeFilter({ daypart: 'late' }), 'buổi khuya');
});

test('soonMinutes only flags showtimes within SOON_MINUTES', async () => {
  const { soonMinutes, SOON_MINUTES } = await import('../src/pages/Schedule/scheduleModel.js');
  const now = at('2026-11-25T18:00');
  assert.equal(SOON_MINUTES, 30);
  assert.equal(soonMinutes(slot(1, '2026-11-25T18:30:00'), now), 30);
  assert.equal(soonMinutes(slot(1, '2026-11-25T18:31:00'), now), null);
  assert.equal(soonMinutes(slot(1, '2026-11-25T17:59:00'), now), null);
});
