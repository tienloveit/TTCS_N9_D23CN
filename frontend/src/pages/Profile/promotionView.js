// Xử lý danh sách ưu đãi ở trang tài khoản. Hàm thuần, test bằng node --test.
// Backend quyết định mã nào áp được; các hàm này chỉ sắp xếp và mô tả để hiển thị.
import {
  cinemaTodayKey,
  dateKeyParts,
  formatDate,
  formatTime,
  parseLocalDateTime,
  toCinemaDateKey,
} from '../../utils/cinemaTime.js';
import { tierName } from '../../utils/membership.js';
import { formatMoney } from '../../utils/opsFormat.js';
import { normalizeSearch } from '../../utils/searchText.js';

export const PROMO_PREVIEW_COUNT = 5;
export const EXPIRING_DAYS = 3;

const isTierScoped = (promotion) => promotion?.minMembershipTier != null;
const isBranchScoped = (promotion) => promotion?.branchId != null;

/** Lọc theo 'all' | 'tier' | 'branch' và từ khóa (bỏ dấu, không phân biệt hoa thường). */
export function filterPromotions(promotions, { scope = 'all', query = '' } = {}) {
  const needle = normalizeSearch(query);
  return (promotions || []).filter((promotion) => {
    if (scope === 'tier' && !isTierScoped(promotion)) return false;
    if (scope === 'branch' && !isBranchScoped(promotion)) return false;
    if (!needle) return true;
    return [promotion.code, promotion.description, promotion.branchName]
      .some((value) => normalizeSearch(value).includes(needle));
  });
}

/** Đếm theo phạm vi: { all, tier, branch }. */
export function countPromotionScopes(promotions) {
  const list = promotions || [];
  return {
    all: list.length,
    tier: list.filter(isTierScoped).length,
    branch: list.filter(isBranchScoped).length,
  };
}

const endMs = (promotion) => parseLocalDateTime(promotion?.endDate)?.getTime() ?? Number.POSITIVE_INFINITY;

/** Hết hạn sớm trước, không có hạn xếp cuối, cùng hạn thì giảm nhiều trước. Không sửa mảng vào. */
export function sortPromotions(promotions) {
  return [...(promotions || [])].sort((a, b) => {
    const byEnd = endMs(a) - endMs(b);
    if (byEnd !== 0 && !Number.isNaN(byEnd)) return byEnd;
    return (Number(b?.discountPercent) || 0) - (Number(a?.discountPercent) || 0);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
const keyToUtc = (key) => {
  const { year, month, day } = dateKeyParts(key);
  return Date.UTC(year, month - 1, day);
};

/** Số ngày lịch giữa hai khóa "YYYY-MM-DD" (ngày UTC luôn đủ 24 giờ nên phép chia là chính xác). */
const daysBetween = (fromKey, toKey) => Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / DAY_MS);

/**
 * Hạn dùng theo giờ rạp so với now:
 * { kind: 'none' | 'today' | 'soon' | 'later', label, daysLeft }
 * Còn bao nhiêu ngày được tính theo ngày lịch giờ rạp, không chia mili giây.
 */
export function describeExpiry(endDate, now = new Date()) {
  const end = parseLocalDateTime(endDate);
  if (!end) return { kind: 'none', label: 'Không giới hạn thời gian', daysLeft: null };

  const time = formatTime(endDate);
  const daysLeft = Math.max(0, daysBetween(cinemaTodayKey(now), toCinemaDateKey(endDate)));
  if (daysLeft === 0) return { kind: 'today', label: `Hết hạn hôm nay lúc ${time}`, daysLeft };

  const label = `Hết hạn ${time}, ${formatDate(endDate)}`;
  return { kind: daysLeft <= EXPIRING_DAYS ? 'soon' : 'later', label, daysLeft };
}

const positive = (value) => value != null && Number(value) > 0;

/** Các điều kiện cần hiện, theo thứ tự: giảm tối đa, đơn tối thiểu, hạng, rạp. [{ key, text }] */
export function promotionConditions(promotion) {
  const conditions = [];
  if (!promotion) return conditions;
  if (positive(promotion.maxDiscount)) {
    conditions.push({ key: 'max', text: `Giảm tối đa ${formatMoney(promotion.maxDiscount)}` });
  }
  if (positive(promotion.minOrderAmount)) {
    conditions.push({ key: 'min', text: `Đơn từ ${formatMoney(promotion.minOrderAmount)}` });
  }
  if (isTierScoped(promotion)) {
    conditions.push({ key: 'tier', text: `Dành cho hạng ${tierName(promotion.minMembershipTier)} trở lên` });
  }
  if (isBranchScoped(promotion)) {
    conditions.push({ key: 'branch', text: `Chỉ áp dụng tại ${promotion.branchName || 'một rạp cụ thể'}` });
  }
  return conditions;
}

/** Lượt còn lại, null nếu không giới hạn. */
export function remainingUses(promotion) {
  if (promotion?.usageLimit == null) return null;
  return Math.max(0, Number(promotion.usageLimit) - (Number(promotion.usedCount) || 0));
}
