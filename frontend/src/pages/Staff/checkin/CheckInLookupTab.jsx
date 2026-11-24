import { Code, DataTable, OpsButton, Segmented, StatusBadge, TextInput } from '../../../components/Ops';
import { formatShowtime } from './checkInUtils';

const filters = [
  { value: 'TODAY', label: 'Suất hôm nay' },
  { value: 'ALL', label: 'Tất cả đơn đã thanh toán' },
];
const seatCodes = booking => booking.seatCodes?.length ? booking.seatCodes :
  (booking.tickets || []).map(ticket => ticket.seatCode).filter(Boolean);

export default function CheckInLookupTab({
  checking, fetchBookingsForLookup, filteredLookupBookings, loadingBookings, lookupError,
  lookupFilter, lookupQuery, lookupInputRef, performCodeCheckIn, setLookupFilter, setLookupQuery,
}) {
  const columns = [
    { key: 'code', header: 'Mã đơn / khách', render: b => <><Code>{b.bookingCode}</Code><small className="o-subline">{b.username || 'Khách tại quầy'}</small></> },
    { key: 'show', header: 'Suất chiếu', render: b => <>{b.movieName}<small className="o-subline">{formatShowtime(b.showtimeStart)}</small><small className="o-subline">{b.roomName || b.branchName}</small></> },
    { key: 'seats', header: 'Ghế', render: b => seatCodes(b).join(', ') },
    { key: 'action', header: 'Thao tác', render: b => {
      const checked = (b.tickets || []).filter(ticket => ticket.checkedInAt).length;
      const count = b.tickets?.length || seatCodes(b).length;
      return count > 0 && checked === count
        ? <StatusBadge tone="warning">Đã vào rạp ({checked}/{count})</StatusBadge>
        : <OpsButton disabled={checking} aria-label={'Soát vé đơn ' + b.bookingCode} onClick={() => performCodeCheckIn(b.bookingCode)}>Soát vé</OpsButton>;
    } },
  ];
  return (
    <div className="o-form">
      <TextInput ref={lookupInputRef} type="search" aria-label="Tìm đơn để soát vé"
        placeholder="Mã đơn, tên khách, phim, số ghế" value={lookupQuery} onChange={event => setLookupQuery(event.target.value)} />
      <div className="o-actions">
        <Segmented label="Phạm vi tra cứu" options={filters} value={lookupFilter} onChange={setLookupFilter} />
        <OpsButton onClick={fetchBookingsForLookup} disabled={loadingBookings}>Làm mới</OpsButton>
      </div>
      <DataTable caption="Đơn đã thanh toán" columns={columns} rows={filteredLookupBookings}
        rowKey={b => b.bookingId} state={loadingBookings ? 'loading' : lookupError ? 'error' : 'ready'}
        error={lookupError} onRetry={fetchBookingsForLookup} stackOnMobile
        empty={{ title: 'Không tìm thấy đơn đã thanh toán', action: { label: 'Xóa từ khóa', onClick: () => { setLookupQuery(''); lookupInputRef.current?.focus(); } } }} />
    </div>
  );
}
