import assert from 'node:assert/strict';
import test from 'node:test';
import { canPayBooking, formatShowDate, getBookingPhase, getRefundDeadline, parseLocalDateTime } from '../src/pages/MyBookings/bookingFormat.js';
import { compareBookingSnapshots } from '../src/pages/MyBookings/bookingChanges.js';

test('refund deadline follows the server for both shorter and longer policies', () => {
  for (const refundDeadline of ['2026-11-12T11:00:00', '2026-11-14T10:00:00']) {
    const result = getRefundDeadline({ status: 'COMPLETED', paidAt: '2026-11-12T10:00:00', refundDeadline });
    assert.equal(result.getTime(), new Date(`${refundDeadline}+07:00`).getTime());
  }
});

test('showtimes and hold expirations use cinema time regardless of browser timezone', () => {
  assert.equal(parseLocalDateTime([2026, 11, 19, 1, 5, 30]).toISOString(), '2026-11-18T18:05:30.000Z');
  assert.equal(formatShowDate('2026-11-19T01:05:30'), 'T5, 19/11/2026');

  const expiry = Date.parse('2026-11-18T18:05:30Z');
  const booking = { status: 'PENDING', paymentStatus: 'PENDING', expiresAt: '2026-11-19T01:05:30' };
  assert.equal(canPayBooking(booking, expiry - 1), true);
  assert.equal(canPayBooking(booking, expiry), false);
  assert.equal(canPayBooking({ ...booking, paymentStatus: 'CANCELLED' }, expiry - 1), false);
  assert.equal(getBookingPhase(booking, expiry), 'pending', 'the server still lets the owner cancel a pending order');
});

test('paid booking phases distinguish upcoming, current, past and used tickets', () => {
  const booking = {
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    showtimeStart: '2026-11-19T20:00:00',
    showtimeEnd: '2026-11-19T22:00:00',
    tickets: [{ checkedInAt: null }],
  };
  const start = Date.parse('2026-11-19T13:00:00Z');
  assert.equal(getBookingPhase(booking, start - 1), 'upcoming');
  assert.equal(getBookingPhase(booking, start), 'in_progress');
  assert.equal(getBookingPhase(booking, Date.parse('2026-11-19T15:00:00Z')), 'watched');
  assert.equal(getBookingPhase({ ...booking, tickets: [{ checkedInAt: '2026-11-19T19:50:00' }] }, start - 1), 'checked_in');
  assert.equal(getBookingPhase({ ...booking, status: 'REFUND_REQUESTED' }, start - 1), 'refund_requested');
});

test('booking notices distinguish observed updates from alternate date encodings and missing data', () => {
  const original = { start: '2026-11-19T20:00:00', end: null, venue: 'Rạp A', total: 90000 };
  assert.deepEqual(compareBookingSnapshots(original, { ...original, start: [2026, 11, 19, 20] }), {});
  assert.deepEqual(compareBookingSnapshots(original, { ...original, start: null, total: null }), {});
  assert.deepEqual(compareBookingSnapshots(original, { ...original, start: '2026-11-19T21:00:00', total: 80000 }), {
    schedule: { before: '20:00 19/11/2026 · Rạp A', after: '21:00 19/11/2026 · Rạp A' },
    total: { before: 90000, after: 80000 },
  });
});

test('missing eligibility or deadline never invents a 24-hour window', () => {
  assert.equal(getRefundDeadline({ status: 'COMPLETED', paidAt: '2026-11-12T10:00:00' }), null);
  assert.equal(getRefundDeadline({ status: 'REFUNDED', refundDeadline: '2026-11-14T10:00:00' }), null);
});
