import { StaffSkeleton, StaffState } from '../StaffUI';
import {
  ArmchairIcon,
  ClockIcon,
  MapPinIcon,
  RefreshIcon,
  SearchIcon,
} from '../../../components/Common/CinemaIcons';
import { formatShowtime } from './checkInUtils';

/** Tab tra cứu nhanh đơn theo mã, tên, email hoặc số điện thoại. */
export default function CheckInLookupTab({
  checking,
  fetchBookingsForLookup,
  filteredLookupBookings,
  loadingBookings,
  lookupError,
  lookupFilter,
  lookupQuery,
  performCodeCheckIn,
  setLookupFilter,
  setLookupQuery,
}) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="pos-search-box" style={{ flex: 1, minWidth: 220 }}>
          <SearchIcon />
          <input
            type="text"
            className="input"
            placeholder="Tìm theo mã đơn (BK...), tài khoản khách, tên phim, số ghế..."
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`pos-time-pill ${
              lookupFilter === 'TODAY' ? 'pos-time-pill--active' : ''
            }`}
            onClick={() => setLookupFilter('TODAY')}
          >
            Suất hôm nay
          </button>
          <button
            type="button"
            className={`pos-time-pill ${
              lookupFilter === 'ALL' ? 'pos-time-pill--active' : ''
            }`}
            onClick={() => setLookupFilter('ALL')}
          >
            Tất cả đơn đã thanh toán
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            onClick={fetchBookingsForLookup}
            aria-label="Làm mới danh sách tra cứu"
            disabled={loadingBookings}
          >
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>

      {loadingBookings ? (
        <StaffSkeleton label="Đang tải danh sách đơn để soát vé" />
      ) : lookupError ? (
        <StaffState title={lookupError} error onRetry={fetchBookingsForLookup} />
      ) : filteredLookupBookings.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          Không tìm thấy đơn đặt vé hoàn tất nào khớp với điều kiện.
        </div>
      ) : (
        <div className="gate-lookup-list">
          {filteredLookupBookings.slice(0, 25).map((b) => {
            const seats =
              b.seatCodes?.length > 0
                ? b.seatCodes
                : (b.tickets || []).map((t) => t.seatCode).filter(Boolean);
            const checkedInCount = (b.tickets || []).filter((t) => t.checkedInAt).length;
            const totalTickets = b.tickets?.length || seats.length || 0;
            const allChecked = totalTickets > 0 && checkedInCount === totalTickets;

            return (
              <div key={b.bookingId} className="gate-lookup-item">
                <div className="gate-lookup-info">
                  <div>
                    <span className="gate-lookup-code">{b.bookingCode}</span>
                    {b.username && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                        • Khách: {b.username}
                      </span>
                    )}
                  </div>
                  <div className="gate-lookup-movie">{b.movieName}</div>
                  <div className="gate-lookup-meta">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ClockIcon size={13} /> {formatShowtime(b.showtimeStart)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <MapPinIcon size={13} /> {b.roomName || b.branchName}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ArmchairIcon size={13} /> Ghế:{' '}
                      <strong style={{ color: '#0f172a' }}>{seats.join(', ')}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {allChecked ? (
                    <span className="status-badge status--pending">
                      Đã vào rạp ({checkedInCount}/{totalTickets})
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                      disabled={checking}
                      onClick={() => performCodeCheckIn(b.bookingCode)}
                    >
                      Check-in ngay
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
