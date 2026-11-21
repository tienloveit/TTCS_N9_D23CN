import Badge from '../../../components/Common/Badge';
import Button from '../../../components/Common/Button';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ScanIcon,
  TicketIcon,
  XCircleIcon,
} from '../../../components/Common/CinemaIcons';
import { StaffState } from '../StaffUI';
import { formatShowtime, formatTimeOnly } from './checkInUtils';

/** Cột phải: kết quả xác thực vé và chi tiết suất/ghế của đơn vừa quét. */
export default function CheckInVerdictPanel({
  checking,
  codeInputRef,
  setActiveTab,
  setVerdict,
  verdict,
}) {
  const scanNext = () => {
    setVerdict(null);
    setActiveTab('SCANNER');
    setTimeout(() => codeInputRef.current?.focus(), 50);
  };

  return (
    <section className="gate-col gate-result" aria-label="Kết quả soát vé" aria-live="polite" aria-atomic="true" aria-busy={checking}>
      {checking ? (
        <StaffState title="Đang xác thực vé…" icon={TicketIcon} />
      ) : !verdict ? (
        <div className="staff-gate-pass">
          <div className="staff-gate-pass-head"><TicketIcon size={20} /> Kết quả soát vé</div>
          <div className="staff-gate-pass-body">
            <ScanIcon size={38} strokeWidth={1.5} />
            <h2>Đang chờ mã vé</h2>
            <p>Sau khi quét, kiểm tra phòng chiếu và số ghế tại đây.</p>
          </div>
        </div>
      ) : verdict.type === 'CONNECTION' ? (
        <StaffState title="Chưa xác nhận được vé" description={verdict.errorMsg} error />
      ) : verdict.type === 'ERROR' ? (
        <div className="gate-verdict gate-verdict--error">
          <div className="gate-verdict-banner">
            <div className="gate-verdict-icon"><XCircleIcon size={26} /></div>
            <div>
              <h2>Từ chối vào cổng</h2>
              <p>Mã quét: {verdict.scannedCode}</p>
            </div>
          </div>
          <div className="gate-verdict-body">
            <p className="gate-reason" role="alert">
              <AlertTriangleIcon size={18} aria-hidden="true" />
              <span>Lý do: {verdict.errorMsg}</span>
            </p>
            <p className="gate-hint">
              Kiểm tra lại đơn đã thanh toán chưa, có đúng chi nhánh và đúng giờ soát vé không, hoặc tìm
              theo tên khách ở tab <strong>Tra cứu đơn vé</strong>.
            </p>
            <div className="gate-verdict-actions">
              <Button onClick={() => { setVerdict(null); codeInputRef.current?.focus(); }}>
                Quét vé tiếp theo
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={'gate-verdict ' + (verdict.type === 'VALID' ? 'gate-verdict--valid' : 'gate-verdict--warning')}>
          <div className="gate-verdict-banner">
            <div className="gate-verdict-icon"><CheckCircleIcon size={26} /></div>
            <div>
              <h2>{verdict.type === 'VALID' ? 'Vé hợp lệ, mời khách vào rạp' : 'Vé đã được soát trước đó'}</h2>
              <p>
                {verdict.type === 'VALID'
                  ? `Đã xác nhận ${verdict.newlyCheckedIn} ghế vào phòng chiếu`
                  : `Có ${verdict.alreadyCount} ghế đã từng quét qua cổng`}
              </p>
            </div>
          </div>

          <div className="gate-verdict-body">
            <div>
              <Badge tone="brand" className="gate-verdict-code">Mã đơn: {verdict.data?.bookingCode || '—'}</Badge>
              <h3 className="gate-verdict-movie">{verdict.data?.movieName || 'Vé xem phim'}</h3>
            </div>

            <dl className="gate-pass-grid">
              <div className="gate-pass-field">
                <dt>Phòng chiếu</dt>
                <dd className="gate-pass-room">{verdict.data?.roomName || '—'}</dd>
              </div>
              <div className="gate-pass-field">
                <dt>Suất chiếu</dt>
                <dd>{formatShowtime(verdict.data?.showtimeStart)}</dd>
              </div>
              <div className="gate-pass-field">
                <dt>Chi nhánh rạp</dt>
                <dd>{verdict.data?.branchName || '—'}</dd>
              </div>
              <div className="gate-pass-field">
                <dt>Khách hàng</dt>
                <dd>{verdict.data?.customerName || 'Khách tại quầy'}</dd>
              </div>
            </dl>

            <div>
              <h4 className="gate-section-label">
                Ghế trong lượt soát ({(verdict.data?.tickets || []).length} vé)
              </h4>
              <ul className="gate-seat-grid">
                {(verdict.data?.tickets || []).map((ticket) => (
                  <li key={ticket.ticketId}
                    className={'gate-seat-badge' + (ticket.alreadyCheckedIn ? ' gate-seat-badge--already' : '')}>
                    <div className="gate-seat-badge-top">
                      <span className="gate-seat-badge-code">Ghế {ticket.seatCode}</span>
                      <Badge tone={ticket.alreadyCheckedIn ? 'warning' : 'success'}>
                        {ticket.alreadyCheckedIn ? 'Đã vào trước đó' : 'Mới vào'}
                      </Badge>
                    </div>
                    <small className="gate-seat-meta">
                      Vé #{ticket.ticketId} · Giờ vào {formatTimeOnly(ticket.checkedInAt)}
                    </small>
                    <small className="gate-seat-meta">
                      Người soát: {ticket.checkedInByName || (ticket.checkedInBy ? `#${ticket.checkedInBy}` : 'Chưa ghi nhận')}
                    </small>
                  </li>
                ))}
              </ul>
            </div>

            <div className="gate-verdict-footer">
              <span>Quét mã tiếp theo hoặc bấm nút để tiếp tục</span>
              <Button variant="primary" onClick={scanNext}>
                Soát khách tiếp theo <ArrowRightIcon size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
