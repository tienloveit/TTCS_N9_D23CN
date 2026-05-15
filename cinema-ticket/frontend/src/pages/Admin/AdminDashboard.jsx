import { createElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../../api';
import { FilmIcon, MapPinIcon, SparkIcon, TicketIcon } from '../../components/Common/CinemaIcons';
import { SkeletonBox } from '../../components/Common/Skeleton';

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

const StatCard = ({ icon, label, value, note, color, loading }) => {
  const iconNode = createElement(icon, { width: 24, height: 24 });

  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}18`, color }}>
        {iconNode}
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        {loading ? (
          <SkeletonBox width="120px" height="28px" borderRadius="4px" />
        ) : (
          <>
            <h3 className="stat-value">{value}</h3>
            {note && <span className="stat-note">{note}</span>}
          </>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ children }) => <div className="analytics-empty">{children}</div>;

const MoneyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="analytics-tooltip">
      <strong>{label}</strong>
      <span>{formatCurrency(payload[0].value)}</span>
    </div>
  );
};

const PercentTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="analytics-tooltip">
      <strong>{label}</strong>
      <span>{formatPercent(payload[0].value)}</span>
    </div>
  );
};

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchAnalytics = async () => {
      try {
        const response = await analyticsApi.getDashboard();
        if (!active) {
          return;
        }
        setAnalytics(response.data.result || emptyAnalytics);
        setError('');
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err.response?.data?.message || 'Không thể tải dữ liệu thống kê');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, []);

  const summary = analytics.summary || emptyAnalytics.summary;
  const revenueTrend = useMemo(
    () =>
      (analytics.revenueTrend || []).map((item) => ({
        ...item,
        revenue: Number(item.revenue || 0),
      })),
    [analytics.revenueTrend]
  );
  const occupancyByBranch = useMemo(
    () =>
      (analytics.occupancyByBranch || []).map((item) => ({
        ...item,
        occupancyRate: Number(item.occupancyRate || 0),
      })),
    [analytics.occupancyByBranch]
  );
  const topMovies = analytics.topMovies || [];
  const foodSales = analytics.foodSales || [];
  const recentBookings = analytics.recentBookings || [];
  const periodLabel =
    analytics.fromDate && analytics.toDate
      ? `${formatDate(analytics.fromDate)} - ${formatDate(analytics.toDate)}`
      : '30 ngày gần nhất';

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Tổng quan hệ thống</h1>
          <p className="page-subtitle">Doanh thu, sức chứa phòng, phim bán chạy và doanh số bắp nước.</p>
        </div>
        <span className="analytics-period">{periodLabel}</span>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        <StatCard
          icon={SparkIcon}
          label="Doanh thu"
          value={formatCurrency(summary.revenue)}
          note={`${formatNumber(summary.paidBookings)} đơn đã thanh toán`}
          color="#16a34a"
          loading={loading}
        />
        <StatCard
          icon={TicketIcon}
          label="Vé đã bán"
          value={formatNumber(summary.ticketsSold)}
          note={`AOV ${formatCurrency(summary.averageOrderValue)}`}
          color="#0756a6"
          loading={loading}
        />
        <StatCard
          icon={MapPinIcon}
          label="Lấp đầy"
          value={formatPercent(summary.occupancyRate)}
          note={`${formatNumber(summary.totalCapacity)} ghế khả dụng`}
          color="#f59e0b"
          loading={loading}
        />
        <StatCard
          icon={FilmIcon}
          label="Doanh thu bắp nước"
          value={formatCurrency(summary.foodRevenue)}
          note={`Vé ${formatCurrency(summary.ticketRevenue)}`}
          color="#7c3aed"
          loading={loading}
        />
      </div>

      <div className="analytics-grid analytics-grid--wide">
        <section className="analytics-card">
          <div className="analytics-card-header">
            <h3>Doanh thu theo ngày</h3>
            <span>{formatCurrency(summary.revenue)}</span>
          </div>
          {loading ? (
            <SkeletonBox height="280px" />
          ) : revenueTrend.length === 0 ? (
            <EmptyState>Chưa có doanh thu trong kỳ này.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueTrend} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ef" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <Tooltip content={<MoneyTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#16a34a' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <h3>Tỷ lệ lấp đầy theo chi nhánh</h3>
            <span>{formatPercent(summary.occupancyRate)}</span>
          </div>
          {loading ? (
            <SkeletonBox height="280px" />
          ) : occupancyByBranch.length === 0 ? (
            <EmptyState>Chưa có suất chiếu trong kỳ này.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={occupancyByBranch} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ef" vertical={false} />
                <XAxis dataKey="branchName" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<PercentTooltip />} />
                <Bar dataKey="occupancyRate" fill="#0756a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      <div className="analytics-grid">
        <section className="analytics-card">
          <div className="analytics-card-header">
            <h3>Top phim</h3>
            <Link to="/admin/movies" className="btn btn-ghost btn-sm">
              Quản lý phim
            </Link>
          </div>
          {loading ? (
            <SkeletonList />
          ) : topMovies.length === 0 ? (
            <EmptyState>Chưa có phim nào phát sinh doanh thu.</EmptyState>
          ) : (
            <div className="analytics-list">
              {topMovies.map((movie) => (
                <MetricRow
                  key={movie.movieId}
                  title={movie.movieName}
                  meta={`${formatNumber(movie.ticketsSold)} vé - ${formatNumber(movie.showtimes)} suất`}
                  value={formatCurrency(movie.revenue)}
                  percent={movie.occupancyRate}
                />
              ))}
            </div>
          )}
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <h3>Doanh số bắp nước</h3>
            <span>{formatCurrency(summary.foodRevenue)}</span>
          </div>
          {loading ? (
            <SkeletonList />
          ) : foodSales.length === 0 ? (
            <EmptyState>Chưa có món ăn nào được bán.</EmptyState>
          ) : (
            <div className="analytics-list">
              {foodSales.map((food) => (
                <MetricRow
                  key={food.foodId}
                  title={food.foodName}
                  meta={`${formatNumber(food.quantity)} sản phẩm`}
                  value={formatCurrency(food.revenue)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <h3 className="section-title">Đơn hàng mới nhất</h3>
          <Link to="/admin/bookings" className="btn btn-ghost btn-sm">
            Quản lý vé
          </Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Phim</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : recentBookings.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                  Chưa có đơn hàng nào
                </td>
              </tr>
            ) : (
              recentBookings.map((booking) => (
                <tr key={booking.bookingId}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {booking.bookingCode || `#${booking.bookingId}`}
                  </td>
                  <td>{booking.movieName || '-'}</td>
                  <td>{formatDate(booking.createdAt)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatCurrency(booking.totalAmount)}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MetricRow = ({ title, meta, value, percent }) => (
  <div className="analytics-list-row">
    <div className="analytics-list-main">
      <strong>{title || '-'}</strong>
      <span>{meta}</span>
      {percent !== undefined && (
        <div className="analytics-progress" aria-label={`Lấp đầy ${formatPercent(percent)}`}>
          <span style={{ width: `${Math.min(Number(percent || 0), 100)}%` }} />
        </div>
      )}
    </div>
    <div className="analytics-list-value">
      <strong>{value}</strong>
      {percent !== undefined && <span>{formatPercent(percent)}</span>}
    </div>
  </div>
);

const SkeletonList = () => (
  <div className="analytics-list">
    {[...Array(5)].map((_, index) => (
      <div className="analytics-list-row" key={index}>
        <div className="analytics-list-main">
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
        <td>
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
