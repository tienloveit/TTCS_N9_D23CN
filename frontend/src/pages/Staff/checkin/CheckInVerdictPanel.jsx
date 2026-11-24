import { Code, OpsButton, OpsPanel, StateBlock, StatusBadge, Verdict } from '../../../components/Ops';
import { formatShowtime, formatTimeOnly } from './checkInUtils';

export default function CheckInVerdictPanel({ checking, codeInputRef, setActiveTab, setVerdict, verdict }) {
  const scanNext = () => {
    setVerdict(null);
    setActiveTab('SCANNER');
    setTimeout(() => codeInputRef.current?.focus(), 50);
  };
  const data = verdict?.data;
  const tickets = data?.tickets || [];
  const previous = tickets.find(ticket => ticket.alreadyCheckedIn);
  let tone = 'neutral';
  let title = 'Đang chờ mã vé';
  if (verdict?.type === 'VALID' || verdict?.newlyCheckedIn > 0) {
    tone = verdict.type === 'VALID' ? 'success' : 'warning';
    title = data?.roomName ? 'Cho vào ' + data.roomName : 'Cho vào phòng chiếu';
  } else if (verdict?.type === 'WARNING') {
    tone = 'warning';
    title = previous?.checkedInAt ? 'Vé đã được soát lúc ' + formatTimeOnly(previous.checkedInAt) : 'Vé đã được soát';
  } else if (verdict?.type === 'TIMING') {
    tone = 'warning';
    title = 'Ngoài giờ soát vé';
  } else if (verdict?.type === 'CONNECTION') {
    tone = 'warning';
    title = 'Chưa xác nhận được vé';
  } else if (verdict?.type === 'ERROR') {
    tone = 'danger';
    title = 'Không cho vào';
  }
  if (verdict?.historical) title = 'Chi tiết lượt soát';
  return (
    <div aria-label="Kết quả soát vé" aria-live="assertive" aria-atomic="true" aria-busy={checking}>
      <OpsPanel>
        {checking ? <StateBlock state="loading" title="Đang xác thực vé" /> : (
          <Verdict tone={tone} title={title} data-fresh={Boolean(verdict && !verdict.historical) || undefined}>
            {!verdict && <p>Sau khi quét, kiểm tra phòng chiếu và số ghế tại đây.</p>}
            {verdict?.errorMsg && <p>{verdict.errorMsg}</p>}
            {verdict?.scannedCode && !data && <p>Mã quét <Code>{verdict.scannedCode}</Code></p>}
            {data && <>
              {verdict.newlyCheckedIn > 0 && <p>Đã soát {verdict.newlyCheckedIn} vé mới.</p>}
              <dl className="o-facts">
                <div><dt>Mã đơn</dt><dd><Code>{data.bookingCode || verdict.scannedCode}</Code></dd></div>
                <div><dt>Phim</dt><dd>{data.movieName || '—'}</dd></div>
                <div><dt>Suất chiếu</dt><dd>{formatShowtime(data.showtimeStart)}</dd></div>
                <div><dt>Chi nhánh</dt><dd>{data.branchName || '—'}</dd></div>
                <div><dt>Khách hàng</dt><dd>{data.customerName || 'Khách tại quầy'}</dd></div>
              </dl>
              <ul className="o-work-list" aria-label="Ghế trong lượt soát">
                {tickets.map(ticket => <li key={ticket.ticketId}>
                  <div><strong>Ghế {ticket.seatCode}</strong><small>Vé #{ticket.ticketId}, giờ vào {formatTimeOnly(ticket.checkedInAt)}</small>
                    <small>Người soát {ticket.checkedInByName || (ticket.checkedInBy ? '#' + ticket.checkedInBy : 'chưa ghi nhận')}</small></div>
                  <StatusBadge tone={ticket.alreadyCheckedIn ? 'warning' : 'success'}>{ticket.alreadyCheckedIn ? 'Đã vào trước đó' : 'Mới vào'}</StatusBadge>
                </li>)}
              </ul>
            </>}
            {verdict && <OpsButton onClick={scanNext}>Soát khách tiếp theo</OpsButton>}
          </Verdict>
        )}
      </OpsPanel>
    </div>
  );
}
