import { StaffState } from '../StaffUI';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ScanIcon,
  TicketIcon,
  XCircleIcon,
} from '../../../components/Common/CinemaIcons';
import { formatShowtime, formatTimeOnly } from './checkInUtils';

/** Cột phải: kết quả xác thực vé và chi tiết suất/ghế của đơn vừa quét. */
export default function CheckInVerdictPanel({
  checking,
  codeInputRef,
  setActiveTab,
  setVerdict,
  verdict,
}) {
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
            <div className="gate-verdict-icon">
              <XCircleIcon style={{ width: 26, height: 26 }} />
            </div>
            <div>
              <h2>Từ chối vào cổng</h2>
              <p>Mã quét: {verdict.scannedCode}</p>
            </div>
          </div>
          <div className="gate-verdict-body">
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangleIcon size={18} />
              <span>Lý do: {verdict.errorMsg}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Vui lòng kiểm tra lại: đơn đặt vé đã thanh toán thành công chưa, có đúng chi nhánh
              rạp hiện tại không, hoặc tra cứu theo tên khách ở tab{' '}
              <strong>Tra cứu đơn vé</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setVerdict(null);
                  codeInputRef.current?.focus();
                }}
              >
                Quét vé tiếp theo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`gate-verdict ${
            verdict.type === 'VALID' ? 'gate-verdict--valid' : 'gate-verdict--warning'
          }`}
        >
          <div className="gate-verdict-banner">
            <div className="gate-verdict-icon">
              <CheckCircleIcon style={{ width: 26, height: 26 }} />
            </div>
            <div>
              <h2>
                {verdict.type === 'VALID'
                  ? 'Vé hợp lệ — Mời khách vào rạp'
                  : 'Cảnh báo — Vé đã được check-in trước đó'}
              </h2>
              <p>
                {verdict.type === 'VALID'
                  ? `Đã xác nhận ${verdict.newlyCheckedIn} ghế vào phòng chiếu`
                  : `Có ${verdict.alreadyCount} ghế đã từng quét qua cổng kiểm soát`}
              </p>
            </div>
          </div>

          <div className="gate-verdict-body">
            {/* Movie & Showtime Pass Summary */}
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#0756a6',
                  background: '#eff6ff',
                  padding: '3px 10px',
                  borderRadius: 6,
                  marginBottom: 6,
                }}
              >
                MÃ ĐƠN: {verdict.data?.bookingCode || '—'}
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                {verdict.data?.movieName || 'Vé xem phim'}
              </h3>
            </div>

            <div className="gate-pass-grid">
              <div className="gate-pass-field">
                <small>Phòng chiếu</small>
                <strong style={{ color: '#ea580c', fontSize: '1.08rem' }}>
                  {verdict.data?.roomName || '—'}
                </strong>
              </div>
              <div className="gate-pass-field">
                <small>Suất chiếu</small>
                <strong>{formatShowtime(verdict.data?.showtimeStart)}</strong>
              </div>
              <div className="gate-pass-field">
                <small>Chi nhánh rạp</small>
                <strong>{verdict.data?.branchName || '—'}</strong>
              </div>
              <div className="gate-pass-field">
                <small>Khách hàng</small>
                <strong>{verdict.data?.customerName || 'Khách tại quầy / Vãng lai'}</strong>
              </div>
            </div>

            {/* Seat Tickets Detail */}
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  marginBottom: 10,
                }}
              >
                Danh sách ghế trong lượt soát ({(verdict.data?.tickets || []).length} vé)
              </div>

              <div className="gate-seat-grid">
                {(verdict.data?.tickets || []).map((ticket) => (
                  <div
                    key={ticket.ticketId}
                    className={`gate-seat-badge ${
                      ticket.alreadyCheckedIn ? 'gate-seat-badge--already' : ''
                    }`}
                  >
                    <div className="gate-seat-badge-top">
                      <span className="gate-seat-badge-code">Ghế {ticket.seatCode}</span>
                      <span
                        className={`status-badge ${
                          ticket.alreadyCheckedIn ? 'status--pending' : 'status--active'
                        }`}
                      >
                        {ticket.alreadyCheckedIn ? 'Đã vào trước đó' : 'Mới vào'}
                      </span>
                    </div>
                    <small style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Mã vé: #{ticket.ticketId} • Giờ vào: {formatTimeOnly(ticket.checkedInAt)}
                    </small>
                    <small style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Nhân viên check-in: {ticket.checkedInByName || (ticket.checkedInBy ? `#${ticket.checkedInBy}` : 'Chưa ghi nhận')}
                    </small>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 12,
                borderTop: '1px dashed var(--border)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Nhấn Enter hoặc quét mã tiếp theo để tiếp tục
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setVerdict(null);
                  setActiveTab('SCANNER');
                  setTimeout(() => codeInputRef.current?.focus(), 50);
                }}
              >
                <span>Soát khách tiếp theo</span>
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
