import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countPromotionScopes,
  describeExpiry,
  EXPIRING_DAYS,
  filterPromotions,
  promotionConditions,
  remainingUses,
  sortPromotions,
} from '../src/pages/Profile/promotionView.js';

const promos = [
  { id: 1, code: 'VANG15', description: 'Ưu đãi hạng Vàng', discountPercent: 15, minMembershipTier: 'GOLD', branchId: null, endDate: '2026-11-30T23:59:00' },
  { id: 2, code: 'CUOITUAN', description: 'Cuối tuần vui vẻ', discountPercent: 10, minMembershipTier: null, branchId: 3, branchName: 'MoviePTIT Hà Đông', endDate: '2026-11-27T23:59:00' },
  { id: 3, code: 'CHAO', description: null, discountPercent: 5, minMembershipTier: null, branchId: null, endDate: null },
  { id: 4, code: 'DONGHANH', description: 'Đồng hành', discountPercent: 20, minMembershipTier: 'SILVER', branchId: 5, branchName: 'MoviePTIT Cầu Giấy', endDate: '2026-11-30T23:59:00' },
];

// 23:30 ngày 25/11/2026 giờ rạp.
const NOW = new Date('2026-11-25T23:30:00+07:00');

test('filters by tier, branch and accent-insensitive query', () => {
  assert.deepEqual(filterPromotions(promos, { scope: 'tier' }).map((p) => p.id), [1, 4]);
  assert.deepEqual(filterPromotions(promos, { scope: 'branch' }).map((p) => p.id), [2, 4]);
  assert.deepEqual(filterPromotions(promos, { query: 'hà đông' }).map((p) => p.id), [2]);
  assert.deepEqual(filterPromotions(promos, { query: 'ha dong' }).map((p) => p.id), [2]);
  assert.deepEqual(filterPromotions(promos, { query: 'vang' }).map((p) => p.id), [1]);
  assert.deepEqual(filterPromotions(promos, { scope: 'branch', query: 'cau giay' }).map((p) => p.id), [4]);
  assert.equal(filterPromotions(promos).length, 4);
  assert.deepEqual(filterPromotions(null), []);
});

test('counts scopes', () => {
  assert.deepEqual(countPromotionScopes(promos), { all: 4, tier: 2, branch: 2 });
  assert.deepEqual(countPromotionScopes([]), { all: 0, tier: 0, branch: 0 });
});

test('sorts by expiry, open-ended last, larger discount first on ties, without mutating', () => {
  const input = [...promos];
  const sorted = sortPromotions(input);
  assert.deepEqual(sorted.map((p) => p.id), [2, 4, 1, 3]);
  assert.deepEqual(input.map((p) => p.id), [1, 2, 3, 4]);
});

test('describes expiry by cinema calendar day', () => {
  assert.equal(EXPIRING_DAYS, 3);
  assert.deepEqual(describeExpiry('2026-11-25T23:59:00', NOW),
    { kind: 'today', label: 'Hết hạn hôm nay lúc 23:59', daysLeft: 0 });
  assert.deepEqual(describeExpiry('2026-11-26T00:10:00', NOW),
    { kind: 'soon', label: 'Hết hạn 00:10, 26/11/2026', daysLeft: 1 });
  assert.deepEqual(describeExpiry('2026-11-28T23:59:00', NOW),
    { kind: 'soon', label: 'Hết hạn 23:59, 28/11/2026', daysLeft: 3 });
  assert.deepEqual(describeExpiry('2026-11-29T23:59:00', NOW),
    { kind: 'later', label: 'Hết hạn 23:59, 29/11/2026', daysLeft: 4 });
  assert.deepEqual(describeExpiry(null, NOW),
    { kind: 'none', label: 'Không giới hạn thời gian', daysLeft: null });
  assert.deepEqual(describeExpiry([2026, 11, 30, 23, 59], NOW),
    { kind: 'later', label: 'Hết hạn 23:59, 30/11/2026', daysLeft: 5 });
});

test('lists conditions in order', () => {
  assert.deepEqual(promotionConditions({
    maxDiscount: 50000, minOrderAmount: 200000, minMembershipTier: 'GOLD', branchId: 3, branchName: 'MoviePTIT Hà Đông',
  }).map((c) => c.text), [
    'Giảm tối đa 50.000 đ',
    'Đơn từ 200.000 đ',
    'Dành cho hạng Vàng trở lên',
    'Chỉ áp dụng tại MoviePTIT Hà Đông',
  ]);
  assert.deepEqual(promotionConditions({ maxDiscount: null, minOrderAmount: 0, branchId: 9 }).map((c) => c.text),
    ['Chỉ áp dụng tại một rạp cụ thể']);
  assert.deepEqual(promotionConditions({}), []);
});

test('remaining uses', () => {
  assert.equal(remainingUses({ usageLimit: null, usedCount: 3 }), null);
  assert.equal(remainingUses({ usageLimit: 20, usedCount: 8 }), 12);
  assert.equal(remainingUses({ usageLimit: 5, usedCount: 9 }), 0);
  assert.equal(remainingUses({ usageLimit: 5 }), 5);
});
