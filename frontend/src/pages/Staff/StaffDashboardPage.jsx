import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { staffApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import {
  ArrowRightIcon, BanknoteIcon, CalendarIcon, CheckCircleIcon, ClockIcon, ListIcon, MapPinIcon,
  RefreshIcon, RotateCcwIcon, ScanIcon, SearchIcon, TicketIcon, TimerIcon,
} from '../../components/Common/CinemaIcons';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import {
  cinemaTodayKey, formatCountdown, formatDateTime, formatDayMonth, formatTime, parseLocalDateTime, toCinemaDateKey,
} from '../../utils/cinemaTime';
import { StaffSkeleton, StaffState } from './StaffUI';
import useNow from './useNow';
import { BOOKING_STATUS_META } from '../../utils/bookingStatus';

// Tự làm mới khi tab đang mở, để suất kế tiếp và đơn chờ thanh toán không bị cũ.
const REFRESH_INTERVAL_MS = 60_000;

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const number = new Intl.NumberFormat('vi-VN');
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const todayLabel = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeZone: 'Asia/Ho_Chi_Minh' });
const format = (formatter, value) => value == null ? '—' : formatter.format(value);
const paymentMethods = { CASH: 'Tiền mặt', VNPAY: 'VNPay', CARD: 'Thẻ' };

const QUICK_ACTIONS = [
  { to: '/staff/booking', title: 'Bán vé tại quầy', detail: 'Chọn suất, ghế, bắp nước rồi thu tiền', icon: TicketIcon, primary: true },
  { to: '/staff/check-in', title: 'Soát vé vào rạp', detail: 'Quét QR, ảnh vé hoặc nhập mã đơn', icon: ScanIcon },
  { to: '/staff/bookings', title: 'Tra cứu đơn vé', detail: 'Tìm và xem chi tiết các đơn đã bán', icon: SearchIcon },
];

const percent = (part, total) => (total > 0 ? Math.min(100, Math.max(0, Math.round((part / total) * 100))) : 0);
const timeOf = (value) => parseLocalDateTime(value)?.getTime() ?? Number.POSITIVE_INFINITY;
const placeOf = (showtime) => [showtime.branchName, showtime.roomName].filter(Boolean).join(' · ');
const sellPath = (showtime) => `/staff/booking?showtime=${encodeURIComponent(showtime.showtimeId)}`;
const bookingPath = (booking) => `/staff/bookings?booking=${encodeURIComponent(booking.bookingId)}`;
const ticketCount = (booking) => booking.tickets?.length || booking.seatCodes?.length || 0;

function formatStartsIn(ms) {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes <= 0) return 'Đang bắt đầu';
  if (minutes < 60) return `còn ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `còn ${hours} giờ ${rest} phút` : `còn ${hours} giờ`;
}

function seatBadge({ availableSeats, totalSeats }) {
  if (availableSeats === 0) return ['Hết ghế', 'neutral'];
  return [`Còn ${availableSeats}${totalSeats ? `/${totalSeats}` : ''} ghế`, availableSeats <= 5 ? 'warning' : 'success'];
}

function QuickActions() {
  return (
    <nav className="staff-dash-actions" aria-label="Thao tác nhanh">
      {QUICK_ACTIONS.map(({ to, title, detail, icon, primary }) => {
        const Icon = icon;
        return (
          <Link key={to} to={to} className={'staff-dash-action' + (primary ? ' staff-dash-action--primary' : '')}>
            <span className="staff-dash-action-icon"><Icon size={22} aria-hidden="true" /></span>
            <span><strong>{title}</strong><small>{detail}</small></span>
          </Link>
        );
      })}
    </nav>
  );
}

function OverviewMetrics({ summary, lastBookingAt }) {
  const cash = Number(summary.cashRevenue ?? 0);
  const card = Number(summary.cardRevenue ?? 0);
  const cashShare = percent(cash, cash + card);
  const ticketsPerBooking = summary.paidBookings > 0 ? summary.ticketsSold / summary.paidBookings : null;
  const ticketNotes = [
    ticketsPerBooking != null && `Trung bình ${format(decimal, ticketsPerBooking)} vé mỗi đơn.`,
    lastBookingAt && `Đơn gần nhất lúc ${formatTime(lastBookingAt)}.`,
  ].filter(Boolean).join(' ');

  return (
    <section className="staff-dash-metrics" aria-label="Chỉ số hôm nay">
      <article className="staff-panel staff-dash-metric">
        <div className="staff-dash-metric-head">
          <p>Doanh thu của bạn hôm nay</p>
          <small>{format(number, summary.paidBookings)} đơn</small>
        </div>
        <strong className="staff-dash-figure">{format(currency, summary.revenue)}</strong>
        {cash + card > 0 && (
          <div className="staff-dash-split" aria-hidden="true">
            {cashShare > 0 && <span className="staff-dash-swatch--cash" style={{ width: `${cashShare}%` }} />}
            {cashShare < 100 && <span className="staff-dash-swatch--card" style={{ width: `${100 - cashShare}%` }} />}
          </div>
        )}
        <dl className="staff-dash-legend">
          <div><dt><span className="staff-dash-swatch staff-dash-swatch--cash" aria-hidden="true" />Tiền mặt</dt><dd>{format(currency, summary.cashRevenue)}</dd></div>
          <div><dt><span className="staff-dash-swatch staff-dash-swatch--card" aria-hidden="true" />VNPay / thẻ</dt><dd>{format(currency, summary.cardRevenue)}</dd></div>
          <div><dt>Trong đó bắp nước</dt><dd>{format(currency, summary.foodRevenue)}</dd></div>
        </dl>
      </article>

      <article className="staff-panel staff-dash-metric">
        <div className="staff-dash-metric-head">
          <p>Vé đã bán</p>
          <small>Bạn bán hôm nay</small>
        </div>
        <strong className="staff-dash-figure">{format(number, summary.ticketsSold)} <small>vé</small></strong>
        {ticketNotes && <p>{ticketNotes}</p>}
      </article>

      <article className="staff-panel staff-dash-metric">
        <div className="staff-dash-metric-head">
          <p>Đã check-in hôm nay</p>
          <small>Toàn chi nhánh</small>
        </div>
        <strong className="staff-dash-figure">{format(number, summary.checkedInTickets)} <small>vé</small></strong>
        <p>Gồm vé do mọi nhân viên trong chi nhánh soát.</p>
      </article>
    </section>
  );
}

function SeatFill({ availableSeats, totalSeats }) {
  const fill = percent(totalSeats - availableSeats, totalSeats);
  const tone = availableSeats === 0 ? ' staff-dash-bar--full' : availableSeats <= 5 ? ' staff-dash-bar--low' : '';
  return (
    <div className="staff-dash-fill">
      <div className={'staff-dash-bar' + tone} role="img" aria-label={`Đã lấp đầy ${fill}% ghế`}>
        <span style={{ width: `${fill}%` }} />
      </div>
      <small aria-hidden="true">Lấp đầy {fill}%</small>
    </div>
  );
}

function NextShowtime({ showtime }) {
  const now = useNow(30_000);
  const start = parseLocalDateTime(showtime.startTime);
  const [badgeLabel, badgeTone] = seatBadge(showtime);
  const startsIn = start && start.getTime() - now < 24 * 60 * 60_000
    ? formatStartsIn(start.getTime() - now)
    : formatDayMonth(showtime.startTime);

  return (
    <div className="staff-dash-next">
      <div className="staff-dash-next-time">
        <span>Kế tiếp</span>
        <time dateTime={showtime.startTime}>{formatTime(showtime.startTime)}</time>
        <small>{startsIn}</small>
      </div>
      <div className="staff-dash-next-info">
        <strong>{showtime.movieName || 'Suất chiếu'}</strong>
        {placeOf(showtime) && <span className="staff-dash-place"><MapPinIcon size={14} aria-hidden="true" /> {placeOf(showtime)}</span>}
        {showtime.totalSeats > 0 && (
          <div className="staff-dash-next-seats">
            <SeatFill availableSeats={showtime.availableSeats} totalSeats={showtime.totalSeats} />
            <Badge tone={badgeTone}>{badgeLabel}</Badge>
          </div>
        )}
      </div>
      <div className="staff-dash-next-actions">
        {showtime.availableSeats > 0 && (
          <Button variant="primary" to={sellPath(showtime)} icon={<TicketIcon size={17} />}>Bán vé suất này</Button>
        )}
        <Button to="/staff/check-in" icon={<ScanIcon size={17} />}>Soát vé</Button>
      </div>
    </div>
  );
}

function UpcomingShowtimes({ showtimes }) {
  const [next, ...later] = showtimes;
  const todayKey = cinemaTodayKey();
  return (
    <section className="staff-panel" aria-labelledby="staff-upcoming-title">
      <div className="staff-panel-heading">
        <h2 id="staff-upcoming-title"><ClockIcon size={19} aria-hidden="true" /> Suất chiếu sắp tới</h2>
        <Link className="staff-text-link" to="/staff/booking">Xem lịch chiếu <ArrowRightIcon size={16} aria-hidden="true" /></Link>
      </div>
      {!next ? <StaffState icon={CalendarIcon} title="Chưa có suất chiếu sắp tới" /> : (
        <>
          <NextShowtime showtime={next} />
          {later.length > 0 && (
            <ul className="staff-dash-showtimes">
              {later.map((showtime) => {
                const [badgeLabel, badgeTone] = seatBadge(showtime);
                const otherDay = toCinemaDateKey(showtime.startTime) !== todayKey;
                return (
                  <li key={showtime.showtimeId}>
                    <time className="staff-dash-st-time" dateTime={showtime.startTime}>
                      {formatTime(showtime.startTime)}
                      {otherDay && <small>{formatDayMonth(showtime.startTime)}</small>}
                    </time>
                    <div className="staff-dash-st-movie">
                      <strong>{showtime.movieName || 'Suất chiếu'}</strong>
                      {placeOf(showtime) && <small>{placeOf(showtime)}</small>}
                    </div>
                    <div className="staff-dash-st-meta">
                      {showtime.totalSeats > 0 && <SeatFill availableSeats={showtime.availableSeats} totalSeats={showtime.totalSeats} />}
                      <Badge tone={badgeTone}>{badgeLabel}</Badge>
                    </div>
                    {showtime.availableSeats > 0 && (
                      <Link className="staff-icon-button staff-dash-st-sell" to={sellPath(showtime)}
                        aria-label={`Bán vé suất ${formatTime(showtime.startTime)} ${showtime.movieName || ''}`.trim()}>
                        <TicketIcon size={18} aria-hidden="true" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function HoldCountdown({ expiresAt }) {
  const now = useNow(1000);
  const end = parseLocalDateTime(expiresAt);
  if (!end) return null;
  const left = end.getTime() - now;
  if (left <= 0) return <small className="staff-dash-hold staff-dash-hold--over">Đã hết giờ giữ ghế</small>;
  return (
    <small className={'staff-dash-hold' + (left < 60_000 ? ' staff-dash-hold--urgent' : '')}>
      Ghế còn giữ {formatCountdown(left)}
    </small>
  );
}

/** Việc cần xử lý: đơn của bạn đang chờ thanh toán và yêu cầu hoàn tiền trong chi nhánh. */
function ActionQueue({ summary, bookings }) {
  const pending = bookings.filter((booking) => booking.status === 'PENDING');
  const pendingTotal = Math.max(pending.length, summary?.pendingBookings ?? 0);
  const refundCount = summary?.refundRequests ?? 0;
  const otherPending = pendingTotal - pending.length;
  const total = pendingTotal + refundCount;

  return (
    <section className="staff-panel" aria-labelledby="staff-queue-title">
      <div className="staff-panel-heading">
        <h2 id="staff-queue-title"><TimerIcon size={19} aria-hidden="true" /> Cần xử lý</h2>
        {total > 0 && <Badge tone="warning">{format(number, total)}</Badge>}
      </div>
      {total === 0 ? <StaffState icon={CheckCircleIcon} title="Không có việc cần xử lý" description="Đơn chờ thanh toán và yêu cầu hoàn tiền sẽ hiện ở đây." /> : (
        <>
          <ul className="staff-dash-queue">
            {pending.map((booking) => {
              const code = booking.bookingCode || `#${booking.bookingId}`;
              const tickets = ticketCount(booking);
              const detail = [code, tickets > 0 && `${tickets} vé`, booking.movieName && `${booking.movieName} ${formatTime(booking.showtimeStart)}`]
                .filter(Boolean).join(' · ');
              return (
                <li key={booking.bookingId}>
                  <span className="staff-dash-queue-icon" aria-hidden="true"><ClockIcon size={17} /></span>
                  <div className="staff-dash-queue-copy">
                    <strong>{booking.paymentMethod === 'VNPAY' ? 'Chờ khách thanh toán VNPay' : 'Chờ thanh toán'}</strong>
                    <small>{detail}</small>
                    <HoldCountdown expiresAt={booking.expiresAt} />
                  </div>
                  <Button size="sm" to={bookingPath(booking)} aria-label={`Mở đơn ${code}`}>Mở đơn</Button>
                </li>
              );
            })}
            {refundCount > 0 && (
              <li>
                <span className="staff-dash-queue-icon staff-dash-queue-icon--refund" aria-hidden="true"><RotateCcwIcon size={17} /></span>
                <div className="staff-dash-queue-copy">
                  <strong>{format(number, refundCount)} yêu cầu hoàn tiền</strong>
                  <small>Trong chi nhánh, chờ quản lý duyệt</small>
                </div>
                <Button size="sm" to="/staff/bookings">Xem đơn</Button>
              </li>
            )}
          </ul>
          {otherPending > 0 && (
            <p className="staff-dash-queue-more">
              Còn {format(number, otherPending)} đơn chờ thanh toán khác. <Link to="/staff/bookings">Xem trong danh sách đơn</Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function RecentBookings({ bookings }) {
  return (
    <section className="staff-panel" aria-labelledby="staff-recent-title">
      <div className="staff-panel-heading">
        <h2 id="staff-recent-title"><ListIcon size={19} aria-hidden="true" /> Giao dịch gần đây của bạn</h2>
        <Link className="staff-text-link" to="/staff/bookings">Xem tất cả <ArrowRightIcon size={16} aria-hidden="true" /></Link>
      </div>
      {bookings.length === 0 ? <StaffState icon={TicketIcon} title="Chưa có giao dịch hôm nay" /> : (
        <div className="staff-table-scroll" tabIndex={0} role="region" aria-label="Giao dịch gần đây">
          <table className="admin-table staff-recent-table">
            <thead>
              <tr>
                <th scope="col">Mã đơn / Khách</th>
                <th scope="col">Phim / Suất chiếu</th>
                <th scope="col">Thanh toán</th>
                <th scope="col" className="staff-dash-amount">Tổng tiền</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span className="sr-only">Chi tiết</span></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const code = booking.bookingCode || `#${booking.bookingId}`;
                const { label, tone } = BOOKING_STATUS_META[booking.status] || { label: booking.status || '—', tone: 'neutral' };
                return (
                  <tr key={booking.bookingId}>
                    <td><strong>{code}</strong><small>{booking.username || 'Khách tại quầy'}</small></td>
                    <td><strong>{booking.movieName || '—'}</strong><small>{formatDateTime(booking.showtimeStart) || '—'}</small></td>
                    <td>{paymentMethods[booking.paymentMethod] || '—'}</td>
                    <td className="staff-dash-amount">{format(currency, booking.totalAmount)}</td>
                    <td><Badge tone={tone}>{label}</Badge></td>
                    <td><Link className="staff-icon-button" aria-label={`Xem đơn ${code}`} to={bookingPath(booking)}><ArrowRightIcon size={17} aria-hidden="true" /></Link></td>
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

const CASH_COUNT_KEY = 'movieptit_cash_count_v1';
const parseMoney = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : null;
};
const groupMoney = (value) => {
  const amount = parseMoney(value);
  return amount == null ? '' : number.format(amount);
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

/** Đối soát két cuối ngày: tiền mặt đã thu − đã hoàn (theo đơn của nhân viên) + tiền lẻ đầu ca so với tiền đếm được. */
function CashDrawer({ summary }) {
  const [opening, setOpening] = useState(() => groupMoney(loadCashCount()?.opening));
  const [counted, setCounted] = useState(() => groupMoney(loadCashCount()?.counted));

  useEffect(() => {
    try {
      localStorage.setItem(CASH_COUNT_KEY, JSON.stringify({ dateKey: cinemaTodayKey(), opening, counted }));
    } catch {
      // Trình duyệt chặn lưu trữ: vẫn đối soát được trong phiên hiện tại.
    }
  }, [opening, counted]);

  const openingAmount = parseMoney(opening) ?? 0;
  const expected = Number(summary.cashExpected ?? 0) + openingAmount;
  const countedAmount = parseMoney(counted);
  const difference = countedAmount == null ? null : countedAmount - expected;
  const [verdictText, verdictTone] = difference == null ? ['Nhập số tiền đếm được để chốt két', 'idle']
    : difference === 0 ? ['Khớp két', 'success']
      : difference > 0 ? [`Thừa ${format(currency, difference)} so với sổ`, 'warning']
        : [`Thiếu ${format(currency, -difference)} so với sổ`, 'danger'];

  return (
    <section className="staff-panel" aria-labelledby="staff-cash-title">
      <div className="staff-panel-heading staff-dash-cash-heading">
        <h2 id="staff-cash-title"><BanknoteIcon size={19} aria-hidden="true" /> Đối soát két tiền mặt</h2>
        <small>Theo các đơn bạn bán hôm nay</small>
      </div>
      <div className="staff-dash-cash-body">
        <dl className="staff-dash-cash-lines">
          <div><dt>Tiền mặt đã thu <small>· {format(number, summary.cashSales)} đơn</small></dt><dd>{format(currency, summary.cashCollected)}</dd></div>
          <div><dt>Đã hoàn tiền mặt <small>· {format(number, summary.cashRefunds)} đơn</small></dt><dd>− {format(currency, summary.cashRefunded)}</dd></div>
          <div><dt>Tiền lẻ đầu ca</dt><dd>+ {format(currency, openingAmount)}</dd></div>
          <div className="staff-dash-cash-total"><dt>Két cần có</dt><dd>{format(currency, expected)}</dd></div>
        </dl>
        <div className="staff-dash-cash-inputs">
          <label>
            <span>Tiền lẻ đầu ca</span>
            <input className="input" inputMode="numeric" placeholder="0" value={opening}
              onChange={(event) => setOpening(groupMoney(event.target.value))} />
          </label>
          <label>
            <span>Đếm được trong két</span>
            <input className="input" inputMode="numeric" placeholder="Nhập khi chốt két" value={counted}
              onChange={(event) => setCounted(groupMoney(event.target.value))} />
          </label>
        </div>
        <p className={`staff-dash-verdict staff-dash-verdict--${verdictTone}`} role="status">{verdictText}</p>
        <p className="staff-dash-cash-note">
          VNPay / thẻ ({format(currency, summary.cardRevenue)}) không đi qua két. Số bạn nhập chỉ lưu trên máy này đến hết ngày.
        </p>
      </div>
    </section>
  );
}

export default function StaffDashboardPage() {
  const { isAdmin } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const latestRequest = useRef(0);

  const loadDashboard = useCallback(async () => {
    // Làm mới tự động và bấm tay có thể chồng nhau: chỉ nhận phản hồi của lần gọi mới nhất.
    const requestId = ++latestRequest.current;
    try {
      const { data } = await staffApi.getDashboard();
      if (requestId !== latestRequest.current) return;
      setDashboard(data.result);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err.response?.data?.message || 'Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void loadDashboard();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  const refresh = () => {
    setLoading(true);
    void loadDashboard();
  };

  const summary = dashboard?.summary;
  const recentBookings = dashboard?.recentBookings || [];
  const showtimes = [...(dashboard?.upcomingShowtimes || [])].sort((a, b) => timeOf(a.startTime) - timeOf(b.startTime));
  const branchName = isAdmin ? null : showtimes[0]?.branchName || recentBookings[0]?.branchName;
  const lastBookingAt = toCinemaDateKey(recentBookings[0]?.createdAt) === cinemaTodayKey() ? recentBookings[0].createdAt : null;

  return (
    <div className="staff-dashboard staff-page">
      <header className="staff-dash-header">
        <div>
          <p className="staff-dash-context">
            <CalendarIcon size={15} aria-hidden="true" /> {[branchName, todayLabel.format(new Date())].filter(Boolean).join(' · ')}
          </p>
          <h1>Tổng quan ca làm việc</h1>
        </div>
        <div className="staff-dash-header-actions">
          {updatedAt && <span>Cập nhật lúc {formatTime(updatedAt)}</span>}
          <Button icon={<RefreshIcon size={17} />} onClick={refresh} disabled={loading}>
            {loading && dashboard ? 'Đang làm mới…' : 'Làm mới'}
          </Button>
        </div>
      </header>

      <QuickActions />

      {loading && !dashboard && <StaffSkeleton label="Đang tải tổng quan" />}
      {error && !dashboard && <StaffState title="Không tải được tổng quan" description={error} error onRetry={refresh} />}
      {error && dashboard && (
        <p className="staff-dash-stale" role="alert">
          <RefreshIcon size={16} aria-hidden="true" />
          Không làm mới được: {error} Đang hiển thị số liệu lúc {formatTime(updatedAt)}.
        </p>
      )}
      {!loading && !error && dashboard && !summary && <StaffState title="Chưa có số liệu hôm nay" icon={CalendarIcon} />}

      {dashboard && (
        <>
          {summary && <OverviewMetrics summary={summary} lastBookingAt={lastBookingAt} />}
          <div className="staff-dash-grid">
            <div className="staff-dash-column">
              <UpcomingShowtimes showtimes={showtimes} />
              <RecentBookings bookings={recentBookings} />
            </div>
            <div className="staff-dash-column">
              <ActionQueue summary={summary} bookings={recentBookings} />
              {summary && <CashDrawer summary={summary} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
