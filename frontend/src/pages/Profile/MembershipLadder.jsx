import { formatMoney } from '../../utils/opsFormat';
import { getTierLadder } from '../../utils/membership';

export default function MembershipLadder({ tier, spending }) {
  const amount = Number(spending);
  const hasSpending = (typeof spending === 'number' || typeof spending === 'string')
    && String(spending).trim() !== '' && Number.isFinite(amount) && amount >= 0;
  const ladder = getTierLadder(tier, hasSpending ? amount : null);
  const next = ladder?.next;
  const title = ladder ? `Hạng ${ladder.current.name}` : 'Hạng thành viên';
  let progress = 'Chưa có thông tin hạng';
  if (next) {
    progress = ladder.remaining > 0
      ? `Còn ${formatMoney(ladder.remaining)} để lên hạng ${next.name}.`
      : `Mốc hạng ${next.name}: ${formatMoney(next.minSpending)}.`;
  } else if (ladder) {
    progress = 'Bạn đang ở hạng cao nhất.';
  }

  return (
    <section className="ac-tier" aria-labelledby="ac-tier-title">
      <h2 id="ac-tier-title" className="ac-tier__name">{title}</h2>
      {hasSpending && (
        <p className="ac-tier__spending">
          <span>Chi tiêu tích lũy</span>
          <span className="ac-tier__amount">{formatMoney(amount)}</span>
        </p>
      )}
      {hasSpending && next && ladder.fill != null && (
        <div className="ac-tier__track" style={{ '--ac-fill': ladder.fill }} aria-hidden="true" />
      )}
      <p className="ac-tier__progress">{progress}</p>

      {ladder && (
        <details className="ac-tier__milestones">
          <summary>Xem các mốc hạng</summary>
          <ol className="ac-ladder" aria-label="Mốc hạng thành viên">
            {[...ladder.steps].reverse().map((step) => (
              <li key={step.code} className="ac-step" aria-current={step.code === tier ? 'step' : undefined}>
                <span>{step.name}</span>
                <span className="ac-step__min">{formatMoney(step.minSpending)}</span>
                {step.code === tier && <span className="ac-step__note">Hạng hiện tại</span>}
              </li>
            ))}
          </ol>
          <p className="ac-tier__foot">Chi tiêu tính trên các đơn đã thanh toán, trừ đơn đã hoàn tiền. Hạng được tính lại sau mỗi lần thay đổi.</p>
        </details>
      )}
    </section>
  );
}
