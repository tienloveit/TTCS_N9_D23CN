import assert from 'node:assert/strict';
import test from 'node:test';
import { getTierLadder, MEMBERSHIP_TIERS, tierName } from '../src/utils/membership.js';

const states = (ladder) => ladder.steps.map((step) => `${step.code}:${step.state}`);

test('tier names fall back to the raw code', () => {
  assert.equal(tierName('GOLD'), 'Vàng');
  assert.equal(tierName('PLATINUM'), 'Bạch Kim');
  assert.equal(tierName('DIAMOND'), 'DIAMOND');
  assert.equal(MEMBERSHIP_TIERS.length, 4);
});

test('each tier yields the right step states, highest step first', () => {
  assert.deepEqual(states(getTierLadder('BRONZE', 0)),
    ['PLATINUM:locked', 'GOLD:locked', 'SILVER:next', 'BRONZE:current']);
  assert.deepEqual(states(getTierLadder('SILVER', 600000)),
    ['PLATINUM:locked', 'GOLD:next', 'SILVER:current', 'BRONZE:reached']);
  assert.deepEqual(states(getTierLadder('GOLD', 2450000)),
    ['PLATINUM:next', 'GOLD:current', 'SILVER:reached', 'BRONZE:reached']);
  assert.deepEqual(states(getTierLadder('PLATINUM', 6000000)),
    ['PLATINUM:current', 'GOLD:reached', 'SILVER:reached', 'BRONZE:reached']);
});

test('silver halfway to gold', () => {
  const ladder = getTierLadder('SILVER', 1250000);
  assert.equal(ladder.current.code, 'SILVER');
  assert.equal(ladder.next.code, 'GOLD');
  assert.equal(ladder.remaining, 750000);
  assert.equal(ladder.fill, 0.5);
});

test('platinum has no next tier', () => {
  const ladder = getTierLadder('PLATINUM', 7000000);
  assert.equal(ladder.next, null);
  assert.equal(ladder.remaining, null);
  assert.equal(ladder.fill, null);
});

test('spending sent as a BigDecimal string', () => {
  const ladder = getTierLadder('GOLD', '2450000.00');
  assert.equal(ladder.remaining, 2550000);
  assert.equal(ladder.fill, 0.15);
});

test('missing spending keeps the ladder without progress', () => {
  for (const spending of [null, undefined, '', 'abc']) {
    const ladder = getTierLadder('SILVER', spending);
    assert.equal(ladder.current.code, 'SILVER');
    assert.equal(ladder.remaining, null);
    assert.equal(ladder.fill, null);
  }
});

test('unknown tier returns null', () => {
  assert.equal(getTierLadder('DIAMOND', 100), null);
  assert.equal(getTierLadder(null, 100), null);
});

test('backend tier wins when spending lags behind it', () => {
  const ladder = getTierLadder('GOLD', 100000);
  assert.equal(ladder.current.code, 'GOLD');
  assert.equal(ladder.fill, 0);
  // Tính theo hạng kế tiếp của Vàng (Bạch Kim, 5.000.000 đ).
  assert.equal(ladder.remaining, 4900000);
});
