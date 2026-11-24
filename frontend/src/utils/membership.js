// Hạng thành viên. Backend quyết định hạng (membershipTier), frontend chỉ hiển thị.
// Ngưỡng ở đây chỉ để giải thích trên thang hạng, không dùng để tự suy ra hạng.
// Đồng bộ với backend MembershipTier.java và docs/02-domain/promotion-membership.md.
export const MEMBERSHIP_TIERS = [
  { code: 'BRONZE', name: 'Đồng', minSpending: 0 },
  { code: 'SILVER', name: 'Bạc', minSpending: 500000 },
  { code: 'GOLD', name: 'Vàng', minSpending: 2000000 },
  { code: 'PLATINUM', name: 'Bạch Kim', minSpending: 5000000 },
];

/** Tên hiển thị, mã lạ thì trả nguyên mã. */
export function tierName(code) {
  return MEMBERSHIP_TIERS.find((tier) => tier.code === code)?.name ?? code;
}

function toAmount(value) {
  if (value == null || String(value).trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * Trạng thái thang hạng theo hạng backend trả về (không suy hạng từ chi tiêu).
 * Trả null nếu tier không thuộc MEMBERSHIP_TIERS.
 * { current, next, remaining, fill, steps: [{ code, name, minSpending, state }] }
 * - steps xếp từ cao xuống thấp; state là 'reached' | 'current' | 'next' | 'locked'.
 * - remaining = max(0, next.minSpending - spending), null khi không có next hoặc thiếu spending.
 * - fill trong [0, 1], null khi thiếu spending hoặc đang ở hạng cao nhất.
 */
export function getTierLadder(tier, spending) {
  const index = MEMBERSHIP_TIERS.findIndex((item) => item.code === tier);
  if (index < 0) return null;

  const amount = toAmount(spending);
  const current = MEMBERSHIP_TIERS[index];
  const next = MEMBERSHIP_TIERS[index + 1] ?? null;
  const hasProgress = next != null && amount != null;

  const steps = MEMBERSHIP_TIERS.map((item, position) => {
    let state = 'locked';
    if (position < index) state = 'reached';
    else if (position === index) state = 'current';
    else if (position === index + 1) state = 'next';
    return { ...item, state };
  }).reverse();

  return {
    current,
    next,
    remaining: hasProgress ? Math.max(0, next.minSpending - amount) : null,
    fill: hasProgress ? clamp01((amount - current.minSpending) / (next.minSpending - current.minSpending)) : null,
    steps,
  };
}
