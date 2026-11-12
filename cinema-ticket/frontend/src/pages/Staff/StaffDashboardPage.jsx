import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { staffApi } from '../../api';
import './StaffDashboardPage.css';
import {
  ArmchairIcon,
  ArrowRightIcon,
  BanknoteIcon,
  ClockIcon,
  CreditCardIcon,
  FilmIcon,
  MapPinIcon,
  PopcornIcon,
  RefreshIcon,
  ReportIcon,
  ScanIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';

const emptyDashboard = {
  summary: {
    revenue: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    foodRevenue: 0,
    paidBookings: 0,
    pendingBookings: 0,
    ticketsSold: 0,
    checkedInTickets: 0,
    refundRequests: 0,
  },
  upcomingShowtimes: [],
  recentBookings: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

const formatTimeShort = (value) =>
  value
    ? new Date(value).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function StaffDashboardPage() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await staffApi.getDashboard();
      const data = res.data.result || emptyDashboard;
      setDashboard(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tải được dữ liệu tổng quan nhân viên');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = dashboard.summary || emptyDashboard.summary;
  const upcomingShowtimes = dashboard.upcomingShowtimes || [];
  const recentBookings = dashboard.recentBookings || [];

  const checkInRate = useMemo(() => {
    const sold = Number(summary.ticketsSold || 0);
    const checked = Number(summary.checkedInTickets || 0);
    if (sold <= 0) return 0;
    return Math.min(100, Math.round((checked / sold) * 100));
  }, [summary.ticketsSold, summary.checkedInTickets]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="staff-dashboard-page staff-overview">
      {/* ===== 1. STAFF DASHBOARD HEADER ===== */}
      <div className="staff-dashboard-top-bar">
        <div className="staff-dashboard-heading">
          <span className="staff-dashboard-eyebrow">QUẢN LÝ QUẦY VÉ</span>
          <div className="pos-top-title">
            <h1>Tổng quan nhân viên</h1>
            <p>Doanh thu và hoạt động bán vé trong ngày.</p>
          </div>
        </div>

        <div className="staff-dashboard-top-actions">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '9px 14px', fontSize: '0.84rem' }}
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >
            <RefreshIcon size={16} />
            <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <Link
            to="/staff/check-in"
            className="btn btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.84rem' }}
          >
            <ScanIcon size={16} />
            <span>Soát vé</span>
          </Link>

          <Link
            to="/staff/booking"
            className="btn btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.86rem' }}
          >
            <TicketIcon size={16} />
            <span>Bán vé tại quầy</span>
          </Link>
        </div>
      </div>

      {/* ===== 2. 4 KPI METRIC CARDS ===== */}
      <div className="staff-dashboard-kpi-grid">
        <div className="staff-dashboard-kpi-card">
          <div className="staff-dashboard-kpi-head">
            <span className="staff-dashboard-kpi-label">Doanh thu hôm nay</span>
            <div
              className="staff-dashboard-kpi-icon"
              style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}
            >
              <ReportIcon size={20} />
            </div>
          </div>
          <h3 className="staff-dashboard-kpi-value" style={{ color: '#15803d' }}>
            {formatCurrency(summary.revenue)}
          </h3>
          <div className="staff-dashboard-kpi-sub">
            <span>Đơn hoàn tất:</span>
            <strong style={{ color: '#0f172a' }}>{formatNumber(summary.paidBookings)} đơn</strong>
          </div>
        </div>

        <div className="staff-dashboard-kpi-card">
          <div className="staff-dashboard-kpi-head">
            <span className="staff-dashboard-kpi-label">Doanh thu tiền mặt</span>
            <div
              className="staff-dashboard-kpi-icon"
              style={{ background: 'rgba(7, 86, 166, 0.12)', color: '#0756a6' }}
            >
              <BanknoteIcon size={20} />
            </div>
          </div>
          <h3 className="staff-dashboard-kpi-value">{formatCurrency(summary.cashRevenue)}</h3>
          <div className="staff-dashboard-kpi-sub">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CreditCardIcon size={13} /> Thẻ / VNPay:
            </span>
            <strong style={{ color: '#0756a6' }}>{formatCurrency(summary.cardRevenue)}</strong>
          </div>
        </div>

        <div className="staff-dashboard-kpi-card">
          <div className="staff-dashboard-kpi-head">
            <span className="staff-dashboard-kpi-label">Vé đã bán</span>
            <div
              className="staff-dashboard-kpi-icon"
              style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#d97706' }}
            >
              <TicketIcon size={20} />
            </div>
          </div>
          <h3 className="staff-dashboard-kpi-value">
            {formatNumber(summary.ticketsSold)}{' '}
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>vé</span>
          </h3>
          <div className="staff-dashboard-kpi-sub">
            <span>Đã check-in hôm nay:</span>
            <strong style={{ color: '#d97706' }}>
              {formatNumber(summary.checkedInTickets)} vé ({checkInRate}%)
            </strong>
          </div>
        </div>

        <div className="staff-dashboard-kpi-card">
          <div className="staff-dashboard-kpi-head">
            <span className="staff-dashboard-kpi-label">Doanh thu bắp nước</span>
            <div
              className="staff-dashboard-kpi-icon"
              style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}
            >
              <PopcornIcon size={20} />
            </div>
          </div>
          <h3 className="staff-dashboard-kpi-value">{formatCurrency(summary.foodRevenue)}</h3>
          <div className="staff-dashboard-kpi-sub">
            <span>Chờ thanh toán / Hoàn vé:</span>
            <strong style={{ color: summary.refundRequests > 0 ? '#dc2626' : '#0f172a' }}>
              {formatNumber(summary.pendingBookings)} chờ • {formatNumber(summary.refundRequests)} hoàn
            </strong>
          </div>
        </div>
      </div>

      {/* ===== 3. UPCOMING SHOWTIMES ===== */}
      <div className="staff-dashboard-workspace">
        {/* RIGHT: UPCOMING SHOWTIMES RADAR */}
        <section className="staff-dashboard-card staff-dashboard-showtimes-panel">
          <div className="staff-dashboard-card-header">
            <div className="staff-dashboard-card-title">
              <FilmIcon size={20} style={{ color: '#ea580c' }} />
              <h3>Suất chiếu sắp tới <span className="staff-dashboard-count">{upcomingShowtimes.length}</span></h3>
            </div>
            <Link to="/staff/booking" className="btn btn-ghost btn-sm">
              <span>Xem lịch chiếu</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>

          {upcomingShowtimes.length === 0 ? (
            <div
              style={{
                padding: '38px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px dashed var(--border)',
              }}
            >
              Hiện không có suất chiếu nào sắp diễn ra trong khung giờ tới.
            </div>
          ) : (
            <div className="staff-dashboard-showtime-list">
              {upcomingShowtimes.map((showtime) => {
                const total = Math.max(1, Number(showtime.totalSeats || 0));
                const available = Math.max(0, Number(showtime.availableSeats || 0));
                const sold = Math.max(0, total - available);
                const occupancyPct = Math.min(100, Math.round((sold / total) * 100));
                const fillColor =
                  occupancyPct >= 85 ? '#dc2626' : occupancyPct >= 50 ? '#f59e0b' : '#0756a6';

                return (
                  <div className="staff-dashboard-showtime-item" key={showtime.showtimeId}>
                    <div className="staff-dashboard-showtime-top">
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            color: '#0f172a',
                            marginBottom: 4,
                          }}
                        >
                          {showtime.movieName}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                            fontSize: '0.78rem',
                            color: '#64748b',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <ClockIcon size={13} />
                            <strong style={{ color: '#0756a6' }}>
                              {formatTimeShort(showtime.startTime)}
                            </strong>{' '}
                            ({formatDateTime(showtime.startTime)})
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPinIcon size={13} /> {showtime.roomName}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            color: available === 0 ? '#dc2626' : '#0f172a',
                          }}
                        >
                          <ArmchairIcon size={14} />
                          Còn {formatNumber(available)}/{formatNumber(showtime.totalSeats)} ghế
                        </span>
                        <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 2 }}>
                          Lấp đầy {occupancyPct}%
                        </div>
                      </div>
                    </div>

                    <div className="staff-dashboard-occupancy-bar">
                      <div
                        className="staff-dashboard-occupancy-fill"
                        style={{ width: `${occupancyPct}%`, background: fillColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="staff-dashboard-card staff-dashboard-activity-panel">
        <div className="staff-dashboard-card-header">
          <h3>Đơn bán gần đây</h3>
          <Link to="/staff/bookings" className="btn btn-ghost btn-sm">
            <span>Xem tất cả đơn đặt vé</span><ArrowRightIcon size={14} />
          </Link>
        </div>
          <div className="admin-table-card" style={{ borderRadius: 12 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Phim & Suất chiếu</th>
                  <th>Phòng / Ghế</th>
                  <th>Thanh toán</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}
                    >
                      Chưa có đơn bán vé nào phát sinh hôm nay.
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((booking) => (
                    <tr key={booking.bookingId}>
                      <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0756a6' }}>
                        {booking.bookingCode}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {booking.movieName || '—'}
                        </div>
                        {booking.showtimeStart && (
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {formatDateTime(booking.showtimeStart)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {booking.seatCodes?.join(', ') || '—'}
                        </div>
                        {booking.roomName && (
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {booking.roomName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                          {booking.paymentMethod === 'CASH'
                            ? 'Tiền mặt'
                            : booking.paymentMethod === 'VNPAY'
                            ? 'VNPay'
                            : booking.paymentMethod || 'Tại quầy'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(booking.totalAmount)}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            booking.status === 'COMPLETED' ? 'status--active' : 'status--pending'
                          }`}
                        >
                          {booking.status === 'COMPLETED' ? 'Hoàn tất' : 'Chờ xử lý'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </section>
    </div>
  );
}
