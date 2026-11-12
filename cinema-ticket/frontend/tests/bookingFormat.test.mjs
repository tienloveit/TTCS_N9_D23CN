import assert from 'node:assert/strict';
import test from 'node:test';
import { getRefundDeadline } from '../src/pages/MyBookings/bookingFormat.js';

test('refund deadline follows the server for both shorter and longer policies', () => {
  for (const refundDeadline of ['2026-11-12T11:00:00', '2026-11-14T10:00:00']) {
    const result = getRefundDeadline({ status: 'COMPLETED', paidAt: '2026-11-12T10:00:00', refundDeadline });
    assert.equal(result.getTime(), new Date(refundDeadline).getTime());
  }
});

test('missing eligibility or deadline never invents a 24-hour window', () => {
  assert.equal(getRefundDeadline({ status: 'COMPLETED', paidAt: '2026-11-12T10:00:00' }), null);
  assert.equal(getRefundDeadline({ status: 'REFUNDED', refundDeadline: '2026-11-14T10:00:00' }), null);
});
