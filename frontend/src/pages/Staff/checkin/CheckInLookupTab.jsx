import Badge from '../../../components/Common/Badge';
import Button from '../../../components/Common/Button';
import {
  ArmchairIcon,
  ClockIcon,
  MapPinIcon,
  RefreshIcon,
  SearchIcon,
} from '../../../components/Common/CinemaIcons';
import { StaffChips, StaffSkeleton, StaffState } from '../StaffUI';
import { formatShowtime } from './checkInUtils';

const LOOKUP_FILTERS = [
  { key: 'TODAY', label: 'Suất hôm nay' },
  { key: 'ALL', label: 'Tất cả đơn đã thanh toán' },
];

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
    <div className="gate-lookup">
      <div className="gate-lookup-toolbar">
        <div className="pos-search-box gate-lookup-search">
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            className="input"
            aria-label="Tìm đơn để soát vé"
            placeholder="Tìm theo mã đơn (BK...), tài khoản khách, tên phim, số ghế..."
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
          />
        </div>
        <div className="gate-lookup-filters">
          <StaffChips label="Phạm vi tra cứu" options={LOOKUP_FILTERS} value={lookupFilter} onChange={setLookupFilter} />
          <Button
            icon={<RefreshIcon size={15} />}
            aria-label="Làm mới danh sách tra cứu"
            onClick={fetchBookingsForLookup}
            disabled={loadingBookings}
          />
        </div>
      </div>

      {loadingBookings ? (
        <StaffSkeleton label="Đang tải danh sách đơn để soát vé" />
      ) : lookupError ? (
        <StaffState title={lookupError} error onRetry={fetchBookingsForLookup} />
      ) : filteredLookupBookings.length === 0 ? (
        <p className="gate-empty">Không tìm thấy đơn đã thanh toán nào khớp với điều kiện.</p>
      ) : (
        <ul className="gate-lookup-list">
          {filteredLookupBookings.slice(0, 25).map((b) => {
            const seats =
              b.seatCodes?.length > 0
                ? b.seatCodes
                : (b.tickets || []).map((t) => t.seatCode).filter(Boolean);
            const checkedInCount = (b.tickets || []).filter((t) => t.checkedInAt).length;
            const totalTickets = b.tickets?.length || seats.length || 0;
            const allChecked = totalTickets > 0 && checkedInCount === totalTickets;

            return (
              <li key={b.bookingId} className="gate-lookup-item">
                <div className="gate-lookup-info">
                  <div>
                    <span className="gate-lookup-code">{b.bookingCode}</span>
                    {b.username && <span className="gate-lookup-customer">· Khách: {b.username}</span>}
                  </div>
                  <div className="gate-lookup-movie">{b.movieName}</div>
                  <div className="gate-lookup-meta">
                    <span><ClockIcon size={13} aria-hidden="true" /> {formatShowtime(b.showtimeStart)}</span>
                    <span><MapPinIcon size={13} aria-hidden="true" /> {b.roomName || b.branchName}</span>
                    <span><ArmchairIcon size={13} aria-hidden="true" /> Ghế: <strong>{seats.join(', ')}</strong></span>
                  </div>
                </div>

                {allChecked ? (
                  <Badge tone="warning">Đã vào rạp ({checkedInCount}/{totalTickets})</Badge>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={checking}
                    aria-label={`Soát vé đơn ${b.bookingCode}`}
                    onClick={() => performCodeCheckIn(b.bookingCode)}
                  >
                    Soát vé
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
