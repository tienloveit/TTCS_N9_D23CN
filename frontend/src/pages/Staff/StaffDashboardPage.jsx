import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { staffApi } from '../../api';
import {
  ArrowRightIcon, BanknoteIcon, CalendarIcon, CreditCardIcon, FilmIcon, ListIcon, MapPinIcon,
  RefreshIcon, ScanIcon, TicketIcon, TimerIcon,
} from '../../components/Common/CinemaIcons';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import { cinemaTodayKey, formatDateTime, formatDayMonth, formatTime } from '../../utils/cinemaTime';
import { StaffSkeleton, StaffState } from './StaffUI';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const number = new Intl.NumberFormat('vi-VN');
const todayLabel = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeZone: 'Asia/Ho_Chi_Minh' });
const format = (formatter, value) => value == null ? '—' : formatter.format(value);
const bookingStatuses = {
  COMPLETED: ['Hoàn tất', 'success'], PENDING: ['Chờ thanh toán', 'warning'],
  CANCELLED: ['Đã hủy', 'neutral'], EXPIRED: ['Hết hạn', 'neutral'],
  REFUND_REQUESTED: ['Yêu cầu hoàn tiền', 'warning'], REFUNDED: ['Đã hoàn tiền', 'neutral'],
};

function OverviewMetrics({ summary }) {
  const metrics = [
    ['Doanh thu hôm nay', format(currency, summary.revenue), CreditCardIcon, `${format(number, summary.paidBookings)} đơn đã thanh toán`],
    ['Vé đã bán', format(number, summary.ticketsSold), TicketIcon],
    ['Vé đã check-in', format(number, summary.checkedInTickets), ScanIcon],
    ['Đơn cần theo dõi', format(number, (summary.pendingBookings ?? 0) + (summary.refundRequests ?? 0)), TimerIcon,
      `${format(number, summary.pendingBookings)} chờ thanh toán · ${format(number, summary.refundRequests)} yêu cầu hoàn`],
  ];
  return (
    <>
      <section className="staff-metrics" aria-label="Chỉ số hôm nay">
        {metrics.map(([label, value, icon, detail]) => {
          const Icon = icon;
          return (
            <article className="staff-panel staff-metric" key={label}>
              <div><span>{label}</span><Icon size={19} aria-hidden="true" /></div>
              <strong>{value}</strong>
              {detail && <small>{detail}</small>}
            </article>
          );
        })}
      </section>
      <dl className="staff-breakdown staff-panel" aria-label="Chi tiết doanh thu">
        <div><dt>Tiền mặt</dt><dd>{format(currency, summary.cashRevenue)}</dd></div>
        <div><dt>Thẻ / VNPay</dt><dd>{format(currency, summary.cardRevenue)}</dd></div>
        <div><dt>Bắp nước</dt><dd>{format(currency, summary.foodRevenue)}</dd></div>
      </dl>
    </>
  );
}

const CASH_COUNT_KEY = 'movieptit_cash_count_v1';
const parseMoney = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
};

// Số tiền nhân viên tự nhập (tiền lẻ đầu ca, tiền đếm được) chỉ lưu trên máy, theo ngày rạp.
function loadCashCount() {
  try {
    const saved = JSON.parse(localStorage.getItem(CASH_COUNT_KEY) || 'null');
    return saved?.dateKey === cinemaTodayKey() ? saved : null;
  } catch {
    return null;
  }
}

/** Đối soát két cuối ngày: tiền mặt đã thu − đã hoàn (theo đơn của nhân viên) so với tiền đếm được. */
function CashDrawer({ summary }) {
  const [opening, setOpening] = useState(() => loadCashCount()?.opening ?? '');
  const [counted, setCounted] = useState(() => loadCashCount()?.counted ?? '');

  useEffect(() => {
    try {
      localStorage.setItem(CASH_COUNT_KEY, JSON.stringify({ dateKey: cinemaTodayKey(), opening, counted }));
    } catch {
      // Trình duyệt chặn lưu trữ: vẫn đối soát được trong phiên hiện tại.
    }
  }, [opening, counted]);

  const expected = Number(summary.cashExpected ?? 0) + (parseMoney(opening) ?? 0);
  const countedAmount = parseMoney(counted);
  const difference = countedAmount == null ? null : countedAmount - expected;
  const verdict = difference == null ? null
    : difference === 0 ? ['Khớp két', 'success']
      : difference > 0 ? [`Thừa ${format(currency, difference)}`, 'warning']
        : [`Thiếu ${format(currency, -difference)}`, 'danger'];

  return (
    <section className="staff-panel staff-cash-drawer" aria-labelledby="staff-cash-title">
      <div className="staff-panel-heading">
        <h2 id="staff-cash-title"><BanknoteIcon size={19} /> Đối soát két tiền mặt</h2>
        <small>Theo các đơn bạn bán hôm nay</small>
      </div>
      <div className="staff-cash-body">
        <dl className="staff-cash-lines">
          <div><dt>Tiền mặt đã thu</dt><dd>{format(currency, summary.cashCollected)}<small>{format(number, summary.cashSales)} đơn</small></dd></div>
          <div><dt>Đã hoàn tiền mặt</dt><dd>− {format(currency, summary.cashRefunded)}<small>{format(number, summary.cashRefunds)} đơn</small></dd></div>
          <div className="staff-cash-total"><dt>Tiền bán vé trong két</dt><dd>{format(currency, summary.cashExpected)}</dd></div>
          <div><dt>VNPay / thẻ (không qua két)</dt><dd>{format(currency, summary.cardRevenue)}</dd></div>
        </dl>
        <div className="staff-cash-count">
          <label>
            <span>Tiền lẻ đầu ca</span>
            <input className="input" inputMode="numeric" placeholder="0" value={opening}
              onChange={(event) => setOpening(event.target.value)} />
          </label>
          <label>
            <span>Tiền đếm được trong két</span>
            <input className="input" inputMode="numeric" placeholder="Nhập khi chốt két" value={counted}
              onChange={(event) => setCounted(event.target.value)} />
          </label>
          <p className="staff-cash-expected">Cần có: <strong>{format(currency, expected)}</strong></p>
          {verdict && <Badge tone={verdict[1]} className="staff-cash-verdict" role="status">{verdict[0]}</Badge>}
        </div>
      </div>
    </section>
  );
}

function UpcomingShowtimes({ showtimes }) {
  return (
    <section className="staff-panel" aria-labelledby="staff-upcoming-title">
      <div className="staff-panel-heading">
        <h2 id="staff-upcoming-title"><FilmIcon size={19} /> Suất chiếu sắp tới</h2>
        <Link className="staff-text-link" to="/staff/booking">Xem lịch chiếu <ArrowRightIcon size={16} /></Link>
      </div>
      {showtimes.length === 0 ? <StaffState icon={CalendarIcon} title="Chưa có suất chiếu sắp tới" /> : (
        <ul className="staff-showtimes">
          {showtimes.map((showtime) => {
            const { availableSeats, totalSeats } = showtime;
            const tone = availableSeats === 0 ? 'neutral' : availableSeats <= 5 ? 'warning' : 'success';
            return (
              <li key={showtime.showtimeId}>
                <time className="staff-showtime-time" dateTime={showtime.startTime}>
                  {formatTime(showtime.startTime) || '—'}
                  <small>{formatDayMonth(showtime.startTime) || '—'}</small>
                </time>
                <div className="staff-showtime-movie">
                  <strong>{showtime.movieName}</strong>
                  <small><MapPinIcon size={13} /> {[showtime.branchName, showtime.roomName].filter(Boolean).join(' · ')}</small>
                </div>
                {availableSeats != null && (
                  <Badge tone={tone}>
                    {availableSeats === 0 ? 'Hết ghế' : `Còn ${availableSeats}${totalSeats ? `/${totalSeats}` : ''} ghế`}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecentBookings({ bookings }) {
  return (
    <section className="staff-panel" aria-labelledby="staff-recent-title">
      <div className="staff-panel-heading">
        <h2 id="staff-recent-title"><ListIcon size={19} /> Giao dịch gần đây</h2>
        <Link className="staff-text-link" to="/staff/bookings">Xem tất cả <ArrowRightIcon size={16} /></Link>
      </div>
      {bookings.length === 0 ? <StaffState icon={TicketIcon} title="Chưa có giao dịch hôm nay" /> : (
        <div className="staff-table-scroll" tabIndex={0} role="region" aria-label="Giao dịch gần đây">
          <table className="admin-table staff-recent-table">
            <thead><tr><th>Mã đơn / Khách</th><th>Phim / Suất chiếu</th><th>Tổng tiền</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead>
            <tbody>
              {bookings.map((booking) => {
                const code = booking.bookingCode || `#${booking.bookingId}`;
                const [label, tone] = bookingStatuses[booking.status] || [booking.status || '—', 'neutral'];
                return (
                  <tr key={booking.bookingId}>
                    <td><strong>{code}</strong><small>{booking.username || 'Khách tại quầy'}</small></td>
                    <td><strong>{booking.movieName || '—'}</strong><small>{formatDateTime(booking.showtimeStart) || '—'}</small></td>
                    <td>{format(currency, booking.totalAmount)}</td>
                    <td><Badge tone={tone}>{label}</Badge></td>
                    <td><Link className="staff-icon-button" aria-label={`Xem đơn ${code}`} to={`/staff/bookings?booking=${booking.bookingId}`}><ArrowRightIcon size={17} /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function StaffDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await staffApi.getDashboard();
      setDashboard(data.result);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const refresh = () => {
    setLoading(true);
    void loadDashboard();
  };

  return (
    <div className="staff-dashboard staff-page">
      <header className="staff-marquee">
        <div className="staff-marquee-copy">
          <span className="staff-marquee-date"><CalendarIcon size={16} /> {todayLabel.format(new Date())}</span>
          <h1>Tổng quan ca làm việc</h1>
          <nav className="staff-marquee-actions" aria-label="Thao tác nhanh">
            <Link to="/staff/booking"><TicketIcon size={18} /> Bán vé tại quầy</Link>
            <Link to="/staff/check-in"><ScanIcon size={18} /> Soát vé vào rạp</Link>
            <Link to="/staff/bookings"><ListIcon size={18} /> Tra cứu đơn</Link>
          </nav>
        </div>
      </header>
      <div className="staff-section-line">
        <h2>Hoạt động hôm nay</h2>
        <Button icon={<RefreshIcon size={17} />} onClick={refresh} disabled={loading}>Làm mới</Button>
      </div>

      {loading && !dashboard && <StaffSkeleton label="Đang tải tổng quan" />}
      {error && <StaffState title="Không tải được tổng quan" description={error} error onRetry={refresh} />}
      {!loading && !error && !dashboard?.summary && <StaffState title="Chưa có số liệu hôm nay" icon={CalendarIcon} />}
      {dashboard && (
        <>
          {dashboard.summary && <OverviewMetrics summary={dashboard.summary} />}
          {dashboard.summary && <CashDrawer summary={dashboard.summary} />}
          <UpcomingShowtimes showtimes={[...(dashboard.upcomingShowtimes || [])].sort((a, b) => a.startTime.localeCompare(b.startTime))} />
          <RecentBookings bookings={dashboard.recentBookings || []} />
        </>
      )}
    </div>
  );
}
