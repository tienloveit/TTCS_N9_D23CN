import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMoney, formatDateLabel } from '../src/utils/opsFormat.js';

test('Money uses Vietnamese grouping, currency and a minus sign for refunds', () => {
  assert.equal(formatMoney(1245000), '1.245.000 đ');
  assert.equal(formatMoney('-12000'), '−12.000 đ');
  assert.equal(formatMoney(0), '0 đ');
  assert.equal(formatMoney(null), '—');
  assert.equal(formatMoney(undefined), '—');
  assert.equal(formatMoney(''), '—');
});

test('Date labels follow midnight and the year boundary in the cinema time zone', () => {
  const now = new Date('2026-12-30T17:00:01Z');
  assert.equal(formatDateLabel([2026, 12, 31, 8], now), 'Hôm nay');
  assert.equal(formatDateLabel('2026-12-31T17:30:00Z', now), 'Ngày mai');
  assert.equal(formatDateLabel('2026-11-24', now), 'T3, 24/11');
  assert.equal(formatDateLabel(null, now), '—');
});
