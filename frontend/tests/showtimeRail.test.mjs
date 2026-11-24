import test from 'node:test';
import assert from 'node:assert/strict';
import { railRange, railPosition, railPhase, railSlotTime } from '../src/components/Ops/railLayout.js';
const day = '2026-11-24';
const time = (clock) => new Date(day + 'T' + clock + ':00+07:00').getTime();
const show = { startTime: [2026, 11, 24, 10], endTime: day + 'T12:00' };
test('Cinema day spans at least 08:00 through midnight and expands for late or early screenings', () => {
  const standard = railRange(day, []);
  assert.equal(standard.from, time('08:00'));
  assert.equal(standard.hours, 16);
  const extended = railRange(day, [{ startTime: day + 'T06:35', endTime: '2026-11-25T00:10' }]);
  assert.equal(extended.from, time('06:00'));
  assert.equal(extended.hours, 19);
});
test('Positions use cinema instants, support Jackson dates and reject invalid intervals', () => {
  const range = railRange(day, [show]);
  assert.deepEqual(railPosition(show, range), { startRatio: 2 / 16, spanRatio: 2 / 16 });
  assert.equal(railPosition({ ...show, endTime: null }, range), null);
  assert.equal(railSlotTime(1 / 16, range), day + 'T09:00');
  assert.equal(railSlotTime(1, range), day + 'T23:55');
});
test('Boundaries and explicit show status', () => {
  assert.equal(railPhase(show, time('09:59')), 'upcoming');
  assert.equal(railPhase(show, time('10:00')), 'playing');
  assert.equal(railPhase(show, time('12:00')), 'past');
  assert.equal(railPhase({ ...show, status: 'CLOSED' }, time('11:00')), 'closed');
  assert.equal(railPhase({ ...show, status: 'CANCELLED' }, time('11:00')), 'cancelled');
});
