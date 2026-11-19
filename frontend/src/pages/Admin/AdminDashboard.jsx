import { createElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import {
  ArmchairIcon,
  ArrowRightIcon,
  BanknoteIcon,
  CalendarIcon,
  PopcornIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';
import { SkeletonBox } from '../../components/Common/Skeleton';
import './AdminDashboard.css';

const emptyAnalytics = {
  summary: {
    revenue: 0,
    ticketRevenue: 0,
    foodRevenue: 0,
    paidBookings: 0,
    ticketsSold: 0,
    totalCapacity: 0,
    occupancyRate: 0,
    averageOrderValue: 0,
  },
  revenueTrend: [],
  topMovies: [],
  foodSales: [],
  occupancyByBranch: [],
  recentBookings: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '-';

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const getStatusLabel = (status) => {
  if (status === 'COMPLETED') {
    return 'Thành công';
  }
  if (status === 'CANCELLED') {
    return 'Đã hủy';
  }
  return 'Chờ thanh toán';
};

const getStatusClass = (status) => {
  if (status === 'COMPLETED') {
    return 'status--active';
  }
  if (status === 'CANCELLED') {
    return 'status--inactive';
  }
  return 'status--pending';
};

const StatCard = ({ icon, label, value, note, loading }) => (
  <div className="dashboard-stat">
    <dt>{createElement(icon, { size: 16, 'aria-hidden': true })} {label}</dt>
    {loading ? (
      <dd><SkeletonBox width="120px" height="29px" borderRadius="4px" /></dd>
    ) : (
      <>
        <dd className="dashboard-stat-value">{value}</dd>
        <dd className="dashboard-stat-note">{note}</dd>
      </>
    )}
  </div>
);

const EmptyState = ({ children }) => <p className="dashboard-empty">{children}</p>;

const MoneyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="dashboard-tooltip">
      <strong>{label}</strong>
      <span>{formatCurrency(payload[0].value)}</span>
    </div>
  );
};

const compactNumber = new Intl.NumberFormat('vi-VN', { notation: 'compact' });
const periodDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

const AdminDashboard = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const basePath = isManager ? '/manager' : '/admin';

  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendDays, setTrendDays] = useState(30);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await analyticsApi.getDashboard();
      setAnalytics(response.data.result || emptyAnalytics);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const summary = analytics.summary || emptyAnalytics.summary;
  const revenueTrend = useMemo(() => {
    const all = (analytics.revenueTrend || []).map((item) => ({
      ...item,
      revenue: Number(item.revenue || 0),
    }));
    if (trendDays && all.length > trendDays) {
      return all.slice(all.length - trendDays);
    }
    return all;
  }, [analytics.revenueTrend, trendDays]);
  const trendRevenue = revenueTrend.reduce((total, item) => total + item.revenue, 0);
  const occupancyByBranch = analytics.occupancyByBranch || [];
  const topMovies = analytics.topMovies || [];
  const foodSales = analytics.foodSales || [];
  const recentBookings = analytics.recentBookings || [];
  const periodLabel =
    analytics.fromDate && analytics.toDate
      ? `${periodDate.format(new Date(analytics.fromDate))} – ${periodDate.format(new Date(analytics.toDate))}`
      : '30 ngày gần nhất';

  return (
    <div className="cinema-dashboard">
      <header className="dashboard-heading">
        <h1>{isManager ? 'Tổng quan chi nhánh' : 'Tổng quan hệ thống'}</h1>
        <p className="dashboard-period">
          <CalendarIcon size={14} aria-hidden="true" />
          <span>{periodLabel}</span>
        </p>
      </header>

      {error && <div className="dashboard-error" role="alert">{error}</div>}

      <dl className="dashboard-stats" aria-label="Chỉ số trong kỳ" aria-busy={loading}>
        <StatCard
          icon={BanknoteIcon}
          label="Tổng doanh thu"
          value={formatCurrency(summary.revenue)}
          note={`${formatNumber(summary.paidBookings)} đơn đã thanh toán`}
          loading={loading}
        />
        <StatCard
          icon={TicketIcon}
          label="Vé đã bán"
          value={formatNumber(summary.ticketsSold)}
          note={`Trung bình ${formatCurrency(summary.averageOrderValue)}/đơn`}
          loading={loading}
        />
        <StatCard
          icon={ArmchairIcon}
          label="Tỷ lệ lấp đầy"
          value={formatPercent(summary.occupancyRate)}
          note={`${formatNumber(summary.totalCapacity)} ghế khả dụng`}
          loading={loading}
        />
        <StatCard
          icon={PopcornIcon}
          label="Doanh thu bắp nước"
          value={formatCurrency(summary.foodRevenue)}
          note={`Doanh thu vé ${formatCurrency(summary.ticketRevenue)}`}
          loading={loading}
        />
      </dl>

      <div className="dashboard-grid dashboard-grid--overview">
        <section className="dashboard-panel" aria-labelledby="dashboard-revenue" aria-busy={loading}>
          <div className="dashboard-panel-heading">
            <div>
              <h2 id="dashboard-revenue">Doanh thu theo ngày</h2>
              <Link to={`${basePath}/revenue`} className="dashboard-link">
                Doanh thu chi tiết <ArrowRightIcon size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="dashboard-range" role="group" aria-label="Khoảng thời gian biểu đồ">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={trendDays === days}
                  onClick={() => setTrendDays(days)}
                >
                  {days} ngày
                </button>
              ))}
            </div>
          </div>
          <div className="dashboard-chart">
            {loading ? (
              <SkeletonBox height="274px" />
            ) : revenueTrend.length === 0 ? (
              <EmptyState>Chưa có doanh thu trong kỳ này.</EmptyState>
            ) : (
              <>
                <p className="dashboard-chart-total">
                  <strong>{formatCurrency(trendRevenue)}</strong>
                  <span>Tổng trong {revenueTrend.length} ngày hiển thị</span>
                </p>
                <ResponsiveContainer width="100%" height={224} minWidth={0}>
                  <LineChart data={revenueTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--dashboard-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={18}
                    />
                    <YAxis
                      width={58}
                      stroke="var(--text-muted)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => compactNumber.format(value)}
                    />
                    <Tooltip content={<MoneyTooltip />} />
                    <Line
                      dataKey="revenue"
                      stroke="var(--accent)"
                      strokeWidth={2.5}
                      dot={revenueTrend.length === 1}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </section>

        <section className="dashboard-panel" aria-labelledby="dashboard-occupancy" aria-busy={loading}>
          <div className="dashboard-panel-heading">
            <h2 id="dashboard-occupancy">Lấp đầy theo chi nhánh</h2>
          </div>
          {loading ? (
            <SkeletonList />
          ) : occupancyByBranch.length === 0 ? (
            <EmptyState>Chưa có suất chiếu trong kỳ này.</EmptyState>
          ) : (
            <ul className="dashboard-list" aria-label="Chi nhánh">
              {occupancyByBranch.map((branch) => (
                <MetricRow
                  key={branch.branchId}
                  title={branch.branchName}
                  meta={`${formatNumber(branch.ticketsSold)} / ${formatNumber(branch.capacity)} ghế`}
                  value={formatPercent(branch.occupancyRate)}
                  progress={branch.occupancyRate}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="dashboard-panel" aria-labelledby="dashboard-bookings" aria-busy={loading}>
        <div className="dashboard-panel-heading">
          <h2 id="dashboard-bookings">Đơn đặt vé gần đây</h2>
          <Link to={`${basePath}/bookings`} className="dashboard-link">
            Quản lý vé <ArrowRightIcon size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-labelledby="dashboard-bookings">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th scope="col">Mã đơn</th>
                <th scope="col">Phim</th>
                <th scope="col">Ngày đặt</th>
                <th scope="col" className="dashboard-table-amount">Tổng tiền</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : recentBookings.length === 0 ? (
                <tr><td colSpan={5} className="dashboard-table-empty">Chưa có đơn hàng nào.</td></tr>
              ) : (
                recentBookings.map((booking) => (
                  <tr key={booking.bookingId}>
                    <td className="dashboard-booking-code">{booking.bookingCode || `#${booking.bookingId}`}</td>
                    <td>{booking.movieName || '–'}</td>
                    <td>{formatDate(booking.createdAt)}</td>
                    <td className="dashboard-table-amount">{formatCurrency(booking.totalAmount)}</td>
                    <td><span className={`dashboard-status ${getStatusClass(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel" aria-labelledby="dashboard-films" aria-busy={loading}>
          <div className="dashboard-panel-heading">
            <h2 id="dashboard-films">Phim có doanh thu cao</h2>
            <Link
              to={isManager ? `${basePath}/showtimes` : '/admin/movies'}
              className="dashboard-link"
            >
              {isManager ? 'Quản lý suất chiếu' : 'Quản lý phim'}
              <ArrowRightIcon size={14} aria-hidden="true" />
            </Link>
          </div>
          {loading ? (
            <SkeletonList />
          ) : topMovies.length === 0 ? (
            <EmptyState>Chưa có phim nào phát sinh doanh thu.</EmptyState>
          ) : (
            <ul className="dashboard-list">
              {topMovies.map((movie) => (
                <MetricRow
                  key={movie.movieId}
                  title={movie.movieName}
                  meta={`${formatNumber(movie.ticketsSold)} vé · ${formatNumber(movie.showtimes)} suất`}
                  value={formatCurrency(movie.revenue)}
                  detail={`${formatPercent(movie.occupancyRate)} lấp đầy`}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-panel" aria-labelledby="dashboard-food" aria-busy={loading}>
          <div className="dashboard-panel-heading">
            <h2 id="dashboard-food">Doanh số bắp nước</h2>
            <Link to={`${basePath}/foods`} className="dashboard-link">
              Quản lý F&B <ArrowRightIcon size={14} aria-hidden="true" />
            </Link>
          </div>
          {loading ? (
            <SkeletonList />
          ) : foodSales.length === 0 ? (
            <EmptyState>Chưa có món ăn nào được bán.</EmptyState>
          ) : (
            <ul className="dashboard-list">
              {foodSales.map((food) => (
                <MetricRow
                  key={food.foodId}
                  title={food.foodName}
                  meta={`${formatNumber(food.quantity)} sản phẩm`}
                  value={formatCurrency(food.revenue)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

const MetricRow = ({ title, meta, value, detail, progress }) => (
  <li className="dashboard-list-row">
    <div className="dashboard-list-main">
      <strong>{title || '–'}</strong>
      <span>{meta}</span>
    </div>
    <div className="dashboard-list-value">
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </div>
    {progress !== undefined && (
      <div className="dashboard-progress" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(Number(progress || 0), 100))}%` }} />
      </div>
    )}
  </li>
);

const SkeletonList = () => (
  <div className="dashboard-list" aria-hidden="true">
    {[...Array(5)].map((_, index) => (
      <div className="dashboard-list-row" key={index}>
        <div className="dashboard-list-main">
          <SkeletonBox width="70%" height="18px" />
          <SkeletonBox width="42%" height="14px" />
        </div>
        <SkeletonBox width="92px" height="18px" />
      </div>
    ))}
  </div>
);

const SkeletonRows = () => (
  <>
    {[...Array(5)].map((_, index) => (
      <tr key={index}>
        <td>
          <SkeletonBox width="120px" height="16px" />
        </td>
        <td>
          <SkeletonBox width="160px" height="16px" />
        </td>
        <td>
          <SkeletonBox width="90px" height="16px" />
        </td>
        <td className="dashboard-table-amount">
          <SkeletonBox width="110px" height="16px" />
        </td>
        <td>
          <SkeletonBox width="100px" height="24px" borderRadius="100px" />
        </td>
      </tr>
    ))}
  </>
);

export default AdminDashboard;
