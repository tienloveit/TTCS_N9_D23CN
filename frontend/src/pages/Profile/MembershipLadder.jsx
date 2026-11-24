import { formatMoney } from '../../utils/opsFormat';
import { getTierLadder, tierName } from '../../utils/membership';

const NOTE = 'Chi tiêu tính trên các đơn đã thanh toán, trừ đơn đã hoàn tiền. Hạng được tính lại sau mỗi lần thay đổi.';

/**
 * Thang hạng: bốn bậc từ cao xuống thấp trong DOM, vạch tiến độ là trang trí (aria-hidden),
 * thông tin cho trình đọc màn hình nằm trong câu tiến độ, "Bạn ở đây" và aria-current="step".
 * Hạng luôn lấy từ backend, không suy ra từ chi tiêu.
 */
export default function MembershipLadder({ tier, spending }) {
  const ladder = getTierLadder(tier, spending);
  const hasSpending = spending != null && String(spending).trim() !== '' && Number.isFinite(Number(spending));
  const title = tier ? `Hạng ${tierName(tier)}` : 'Hạng thành viên';

  let progress = null;
  if (ladder && hasSpending) {
    progress = ladder.next
      ? `Còn ${formatMoney(ladder.remaining)} để lên hạng ${ladder.next.name}.`
      : 'Bạn đang ở hạng cao nhất.';
  }

  return (
    <section className="ac-tier" aria-labelledby="ac-tier-title">
      <div className="ac-tier__summary">
        <h2 id="ac-tier-title" className="ac-tier__name">{title}</h2>
        {hasSpending && (
          <p className="ac-tier__spending">
            <span className="ac-tier__amount">{formatMoney(spending)}</span>
            <span className="ac-tier__caption">chi tiêu tích lũy</span>
          </p>
        )}
        {progress && <p className="ac-tier__progress">{progress}</p>}
      </div>

      {ladder && (
        <ol className="ac-ladder" aria-label="Thang hạng thành viên">
          {ladder.steps.map((step) => (
            <li
              key={step.code}
              className="ac-step"
              data-state={step.state}
              data-line={hasSpending ? undefined : 'none'}
              aria-current={step.state === 'current' ? 'step' : undefined}
              style={step.state === 'next' ? { '--ac-fill': ladder.fill ?? 0 } : undefined}
            >
              <span className="ac-step__dot" aria-hidden="true" />
              <span className="ac-step__name">{step.name}</span>
              <span className="ac-step__min">{formatMoney(step.minSpending)}</span>
              {step.state === 'current' && <span className="ac-step__note">Bạn ở đây</span>}
              {step.state === 'next' && ladder.remaining != null && (
                <span className="ac-step__note">còn {formatMoney(ladder.remaining)}</span>
              )}
            </li>
          ))}
        </ol>
      )}

      <p className="ac-tier__foot">{NOTE}</p>
    </section>
  );
}
