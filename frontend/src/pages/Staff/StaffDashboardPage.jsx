import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { staffApi } from '../../api';
import {
  ArrowRightIcon, CalendarIcon, CreditCardIcon, FilmIcon, ListIcon, MapPinIcon,
  RefreshIcon, ScanIcon, TicketIcon, TimerIcon,
} from '../../components/Common/CinemaIcons';
import { StaffSkeleton, StaffState } from './StaffUI';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const number = new Intl.NumberFormat('vi-VN');
const shortTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });
const shortDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
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
                  {format(shortTime, showtime.startTime && new Date(showtime.startTime))}
                  <small>{format(shortDate, showtime.startTime && new Date(showtime.startTime))}</small>
                </time>
                <div className="staff-showtime-movie">
                  <strong>{showtime.movieName}</strong>
                  <small><MapPinIcon size={13} /> {[showtime.branchName, showtime.roomName].filter(Boolean).join(' · ')}</small>
                </div>
                {availableSeats != null && (
                  <span className={`staff-status staff-status--${tone}`}>
                    {availableSeats === 0 ? 'Hết ghế' : `Còn ${availableSeats}${totalSeats ? `/${totalSeats}` : ''} ghế`}
                  </span>
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
                    <td><strong>{booking.movieName || '—'}</strong><small>{format(dateTime, booking.showtimeStart && new Date(booking.showtimeStart))}</small></td>
                    <td>{format(currency, booking.totalAmount)}</td>
                    <td><span className={`staff-status staff-status--${tone}`}>{label}</span></td>
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
        <button type="button" className="btn btn-secondary" onClick={refresh} disabled={loading}>
          <RefreshIcon size={17} /> Làm mới
        </button>
      </div>

      {loading && !dashboard && <StaffSkeleton label="Đang tải tổng quan" />}
      {error && <StaffState title="Không tải được tổng quan" description={error} error onRetry={refresh} />}
      {!loading && !error && !dashboard?.summary && <StaffState title="Chưa có số liệu hôm nay" icon={CalendarIcon} />}
      {dashboard && (
        <>
          {dashboard.summary && <OverviewMetrics summary={dashboard.summary} />}
          <UpcomingShowtimes showtimes={[...(dashboard.upcomingShowtimes || [])].sort((a, b) => a.startTime.localeCompare(b.startTime))} />
          <RecentBookings bookings={dashboard.recentBookings || []} />
        </>
      )}
    </div>
  );
}
