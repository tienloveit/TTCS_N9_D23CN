import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { Code, DataTable, Field, Money, OpsButton, OpsDialog, OpsDrawer, OpsPage, OpsPanel, ShowtimeRail, StatStrip, StateBlock, StatusBadge, TextInput } from '../../components/Ops';
import { cinemaTodayKey, formatCountdown, formatDateTime, formatTime, parseLocalDateTime } from '../../utils/cinemaTime';
import useNow from '../../utils/useNow';
import useShiftSchedule from './useShiftSchedule';

const number = new Intl.NumberFormat('vi-VN');
const methods = { CASH: 'Tiền mặt', VNPAY: 'VNPay', CARD: 'Thẻ' };
const cashKey = 'movieptit_cash_count_v1';
const bookingPath = (b) => '/staff/bookings?booking=' + encodeURIComponent(b.bookingId);
const code = (b) => b.bookingCode || '#' + b.bookingId;
function HoldCountdown({ expiresAt }) {
  const now = useNow(1000);
  const end = parseLocalDateTime(expiresAt);
  if (!end) return null;
  return <small>{end <= now ? 'Đã hết giờ giữ ghế' : 'Ghế còn giữ ' + formatCountdown(end - now)}</small>;
}

function ActionQueue({ summary, bookings }) {
  const pending = bookings.filter((b) => b.status === 'PENDING');
  const other = Math.max(0, (summary?.pendingBookings ?? 0) - pending.length);
  const refunds = summary?.refundRequests || 0;
  return <OpsPanel title="Cần xử lý">
    {!pending.length && !other && !refunds ? <StateBlock state="empty" title="Không có việc cần xử lý" description="Đơn chờ thanh toán và yêu cầu hoàn tiền sẽ hiện ở đây." />
      : <ul className="o-work-list">{pending.map((b) => <li key={b.bookingId}>
        <div><strong>{b.paymentMethod === 'VNPAY' ? 'Chờ khách thanh toán VNPay' : 'Chờ thanh toán'}</strong>
          <span><Code>{code(b)}</Code> {b.movieName} {formatTime(b.showtimeStart)}</span><HoldCountdown expiresAt={b.expiresAt} /></div>
        <OpsButton to={bookingPath(b)}>Mở đơn</OpsButton>
      </li>)}
        {refunds > 0 && <li><span>{number.format(refunds)} yêu cầu hoàn tiền chờ quản lý duyệt</span><OpsButton to="/staff/bookings">Xem đơn</OpsButton></li>}
        {other > 0 && <li><span>{number.format(other)} đơn khác chờ thanh toán</span><OpsButton to="/staff/bookings">Xem đơn</OpsButton></li>}
      </ul>}
  </OpsPanel>;
}

const amount = (input) => Number(String(input ?? '').replace(/\D/g, ''));
function savedCount() {
  try {
    const item = JSON.parse(localStorage.getItem(cashKey));
    return item?.dateKey === cinemaTodayKey() ? item : {};
  } catch { return {}; }
}
function CashDrawer({ summary }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(() => savedCount().opening || '');
  const [counted, setCounted] = useState(() => savedCount().counted || '');
  useEffect(() => {
    try { localStorage.setItem(cashKey, JSON.stringify({ dateKey: cinemaTodayKey(), opening, counted })); }
    catch { /* Keep the count available in memory. */ }
  }, [opening, counted]);
  const expected = Number(summary.cashExpected ?? 0) + amount(opening);
  const difference = amount(counted) - expected;
  const moneyInput = (v) => v.replace(/\D/g, '') ? number.format(amount(v)) : '';
  return <OpsPanel title="Đối soát két tiền mặt" actions={<OpsButton onClick={() => setOpen(true)}>Đối soát</OpsButton>}>
    <dl className="o-facts">
      <div><dt>Tiền mặt đã thu ({summary.cashSales} đơn)</dt><dd><Money value={summary.cashCollected} /></dd></div>
      <div><dt>Đã hoàn tiền mặt ({summary.cashRefunds} đơn)</dt><dd><Money value={summary.cashRefunded} /></dd></div>
      <div><dt>Tiền lẻ đầu ca</dt><dd><Money value={amount(opening)} /></dd></div>
      <div><dt>Két cần có</dt><dd><Money value={expected} /></dd></div>
    </dl>
    <OpsDialog open={open} onClose={() => setOpen(false)} title="Đối soát két tiền mặt" footer={<OpsButton onClick={() => setOpen(false)}>Đóng</OpsButton>}>
      <div className="o-form-grid">
        <Field label="Tiền lẻ đầu ca"><TextInput inputMode="numeric" placeholder="0" value={opening} onChange={(e) => setOpening(moneyInput(e.target.value))} /></Field>
        <Field label="Đếm được trong két"><TextInput inputMode="numeric" value={counted} onChange={(e) => setCounted(moneyInput(e.target.value))} /></Field>
      </div>
      <p>Két cần có <Money value={expected} /></p>
      <p role="status">{counted === '' ? 'Nhập số tiền đếm được để chốt két.' : difference === 0 ? 'Khớp két' : <>{difference > 0 ? 'Thừa' : 'Thiếu'} <Money value={Math.abs(difference)} /> so với sổ</>}</p>
      <p>VNPay và thẻ không đi qua két. Số bạn nhập được lưu trên máy này đến hết ngày.</p>
    </OpsDialog>
  </OpsPanel>;
}

const columns = [
  { key: 'code', header: 'Mã đơn', render: (b) => <Code>{code(b)}</Code> },
  { key: 'customer', header: 'Khách', render: (b) => b.username || 'Khách tại quầy' },
  { key: 'movie', header: 'Phim và suất chiếu', render: (b) => <>{b.movieName}<small className="o-subline">{formatDateTime(b.showtimeStart)}</small></> },
  { key: 'method', header: 'Thanh toán', render: (b) => methods[b.paymentMethod] || '—' },
  { key: 'total', header: 'Tổng tiền', align: 'end', render: (b) => <Money value={b.totalAmount} /> },
  { key: 'status', header: 'Trạng thái', render: (b) => <StatusBadge kind="booking" value={b.status} /> },
];

export default function StaffDashboardPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const schedule = useShiftSchedule();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [detail, setDetail] = useState(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const id = ++sequence.current;
    try {
      const { data } = await staffApi.getDashboard();
      if (id === sequence.current) { setDashboard(data.result); setUpdatedAt(new Date()); setError(''); }
    } catch (err) {
      if (id === sequence.current) setError(err.response?.data?.message || 'Kiểm tra kết nối rồi thử lại.');
    } finally { if (id === sequence.current) setLoading(false); }
  }, []);
  const retrySchedule = schedule.retry;
  useEffect(() => {
    const requestSequence = sequence;
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') { void load(); retrySchedule(); }
    }, 60_000);
    return () => { clearInterval(timer); requestSequence.current++; };
  }, [load, retrySchedule]);
  const refresh = () => { setLoading(true); void load(); retrySchedule(); };
  const recent = dashboard?.recentBookings || [];
  const summary = dashboard?.summary;
  const canSell = show => show.status === 'OPEN' && show.availableSeats !== 0 && parseLocalDateTime(show.startTime) > schedule.now;
  const next = schedule.shows.filter(canSell)
    .sort((first, second) => parseLocalDateTime(first.startTime) - parseLocalDateTime(second.startTime))[0];
  const branch = schedule.shows[0]?.branchName || recent[0]?.branchName;
  return <OpsPage title="Tổng quan ca làm việc" description={!isAdmin && branch ? 'Ca của bạn tại ' + branch + '.' : undefined}
    actions={<><OpsButton to="/staff/check-in">Soát vé</OpsButton><OpsButton variant="primary" to="/staff/booking">Bán vé tại quầy</OpsButton></>}>
    <OpsPanel title="Suất chiếu hôm nay" actions={<OpsButton variant="ghost" disabled={loading} onClick={refresh}>Làm mới</OpsButton>}>
      {schedule.state === 'ready' ? <ShowtimeRail date={schedule.date} showtimes={schedule.shows} nextId={next?.showtimeId} isDisabled={show => !canSell(show)}
        onSelect={(s) => navigate('/staff/booking', { state: { showtimeId: s.showtimeId } })} />
        : <StateBlock state={schedule.state} title={schedule.state === 'loading' ? 'Đang tải lịch chiếu' : 'Không tải được lịch chiếu'} onRetry={retrySchedule} />}
    </OpsPanel>
    {error && <StateBlock state="error" title="Không tải được tổng quan" description={error} onRetry={refresh} />}
    {updatedAt && <small className="o-subline">Cập nhật lúc {formatTime(updatedAt)}</small>}
    {loading && !dashboard && <StateBlock state="loading" title="Đang tải số liệu ca" />}
    {dashboard && !summary && <StateBlock state="empty" title="Chưa có số liệu hôm nay" action={{ label: 'Làm mới', onClick: refresh }} />}
    {summary && <StatStrip items={[
      { label: 'Doanh thu của bạn', value: <Money value={summary.revenue} />, note: number.format(summary.paidBookings) + ' đơn đã thanh toán' },
      { label: 'VNPay và thẻ', value: <Money value={summary.cardRevenue} /> },
      { label: 'Doanh thu bắp nước', value: <Money value={summary.foodRevenue} /> },
      { label: 'Vé bạn đã bán', value: summary.ticketsSold },
      { label: 'Vé đã soát tại chi nhánh', value: summary.checkedInTickets },
    ]} />}
    {dashboard && <div className="o-work-pair"><ActionQueue summary={summary} bookings={recent} />{summary && <CashDrawer summary={summary} />}</div>}
    {dashboard && <OpsPanel flush title="Giao dịch gần đây của bạn" actions={<OpsButton to="/staff/bookings">Xem tất cả</OpsButton>}>
      <DataTable caption="Giao dịch gần đây" columns={columns} rows={recent.slice(0, 8)} rowKey={(b) => b.bookingId}
        selectedKey={detail?.bookingId} onRowOpen={setDetail} stackOnMobile empty={{ title: 'Chưa có giao dịch hôm nay', action: { label: 'Bán vé tại quầy', onClick: () => navigate('/staff/booking') } }} />
    </OpsPanel>}
    <OpsDrawer open={Boolean(detail)} title={'Chi tiết đơn ' + (detail ? code(detail) : '')} onClose={() => setDetail(null)}
      footer={detail && <OpsButton to={bookingPath(detail)}>Mở quản lý đơn</OpsButton>}>
      {detail && <dl className="o-facts">{columns.map((c) => <div key={c.key}><dt>{c.header}</dt><dd>{c.render(detail)}</dd></div>)}
        <div><dt>Ghế</dt><dd>{(detail.seatCodes || detail.tickets?.map((t) => t.seatCode) || []).join(', ') || '—'}</dd></div>
      </dl>}
    </OpsDrawer>
  </OpsPage>;
}
