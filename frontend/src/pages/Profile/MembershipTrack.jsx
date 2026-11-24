import { CheckIcon } from '../../components/Common/CinemaIcons';
import { getTierLadder, getTierTrack } from '../../utils/membership';
import { formatMoney } from '../../utils/opsFormat';

function progressText(ladder, hasSpending) {
  if (!ladder) return 'Chưa có thông tin hạng.';
  const { next } = ladder;
  if (!next) return 'Bạn đang ở hạng cao nhất.';
  const milestone = `Mốc hạng ${next.name}: ${formatMoney(next.minSpending)}.`;
  if (!hasSpending) return milestone;
  // remaining = 0 nghĩa là backend chưa tính lại hạng. Frontend không tự nâng hạng.
  if (ladder.remaining > 0) return `Còn ${formatMoney(ladder.remaining)} để lên hạng ${next.name}.`;
  return `${milestone} Hạng được cập nhật sau mỗi lần thay đổi.`;
}

/**
 * Đường hạng: cả bốn mốc và vị trí của khách. Hạng lấy từ backend (membershipTier),
 * ngưỡng chỉ để vẽ. Ray, nút tròn và dấu vị trí vẽ bằng CSS và đều aria-hidden;
 * thông tin cho trình đọc màn hình nằm trong chữ.
 */
export default function MembershipTrack({ tier, spending }) {
  const amount = Number(spending);
  const hasSpending = (typeof spending === 'number' || typeof spending === 'string')
    && String(spending).trim() !== '' && Number.isFinite(amount) && amount >= 0;
  const ladder = getTierLadder(tier, hasSpending ? amount : null);
  const track = getTierTrack(ladder);
  const showMarker = Boolean(ladder?.next) && ladder.fill != null;
  const title = ladder ? `Hạng ${ladder.current.name}` : 'Hạng thành viên';

  return (
    <section className="ac-tier" aria-labelledby="ac-tier-title">
      <div className="ac-tier__summary">
        <h2 id="ac-tier-title" className="ac-tier__name">{title}</h2>
        {hasSpending && (
          <p className="ac-tier__spending">
            <span>Chi tiêu tích lũy</span>
            <span className="ac-tier__amount">{formatMoney(amount)}</span>
          </p>
        )}
      </div>

      {track && (
        <ol className="ac-track" aria-label="Các mốc hạng thành viên">
          {track.map((stop) => (
            <li
              key={stop.code}
              className="ac-track__stop"
              data-state={stop.state}
              aria-current={stop.state === 'current' ? 'step' : undefined}
              style={{ '--ac-fill': stop.fill ?? 0 }}
            >
              <span className="ac-track__node" data-state={stop.state} aria-hidden="true">
                {stop.state === 'reached' && <CheckIcon size={10} strokeWidth={3} />}
              </span>
              {showMarker && stop.state === 'current' && <span className="ac-track__you" aria-hidden="true" />}
              <span className="ac-track__name">
                {stop.name}
                {stop.state === 'reached' && <span className="sr-only">, đã đạt</span>}
              </span>
              <span className="ac-track__min">{formatMoney(stop.minSpending)}</span>
              {stop.state === 'current' && <span className="ac-track__tag">Hạng của bạn</span>}
            </li>
          ))}
        </ol>
      )}

      <p className="ac-tier__progress">{progressText(ladder, hasSpending)}</p>
      {track && <p className="ac-tier__foot">Chi tiêu tính trên các đơn đã thanh toán, trừ đơn đã hoàn tiền.</p>}
    </section>
  );
}
