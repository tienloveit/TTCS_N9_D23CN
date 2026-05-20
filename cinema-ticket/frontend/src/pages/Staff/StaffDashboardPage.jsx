import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { staffApi } from '../../api';

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
  activeShift: null,
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
    })
    : '-';

const formatDuration = (minutes) => {
  if (minutes == null) return '-';
  const hours = Math.floor(Number(minutes) / 60);
  const mins = Number(minutes) % 60;
  if (hours <= 0) return `${mins} phút`;
  return `${hours} giờ ${mins} phút`;
};

const StatCard = ({ label, value, note, color = '#0756a6' }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ backgroundColor: `${color}18`, color }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 16v-5" />
        <path d="M12 16V8" />
        <path d="M16 16v-3" />
      </svg>
    </div>
    <div className="stat-info">
      <span className="stat-label">{label}</span>
      <h3 className="stat-value">{value}</h3>
      {note && <span className="stat-note">{note}</span>}
    </div>
  </div>
);

export default function StaffDashboardPage() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [shiftNote, setShiftNote] = useState('');
  const [shiftHistory, setShiftHistory] = useState([]);
  const [submittingShift, setSubmittingShift] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await staffApi.getDashboard();
      const historyRes = await staffApi.getShiftHistory();
      const data = res.data.result || emptyDashboard;
      setDashboard(data);
      setShiftHistory(historyRes.data.result || []);
      setClosingCash(data.activeShift?.expectedCash ?? '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tải được dashboard nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleOpenShift = async (event) => {
    event.preventDefault();
    setSubmittingShift(true);
    try {
      await staffApi.openShift({
        openingCash: Number(openingCash || 0),
        note: shiftNote,
      });
      setOpeningCash('');
      setShiftNote('');
      toast.success('Đã mở ca');
      await loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không mở được ca');
    } finally {
      setSubmittingShift(false);
    }
  };

  const handleCloseShift = async (event) => {
    event.preventDefault();
    setSubmittingShift(true);
    try {
      await staffApi.closeShift({
        closingCash: Number(closingCash || 0),
        note: shiftNote,
      });
      setShiftNote('');
      toast.success('Đã đóng ca');
      await loadDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không đóng được ca');
    } finally {
      setSubmittingShift(false);
    }
  };

  const summary = dashboard.summary || emptyDashboard.summary;
  const activeShift = dashboard.activeShift;
  const upcomingShowtimes = dashboard.upcomingShowtimes || [];
  const recentBookings = dashboard.recentBookings || [];

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Tổng quan ca làm</h1>
          <p className="page-subtitle">Theo dõi doanh thu quầy, tiền mặt, check-in và suất chiếu sắp tới.</p>
        </div>
        <Link to="/staff/booking" className="btn btn-primary">Bán vé</Link>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Doanh thu ca"
          value={formatCurrency(summary.revenue)}
          note={`${formatNumber(summary.paidBookings)} đơn đã thanh toán`}
          color="#16a34a"
        />
        <StatCard
          label="Tiền mặt"
          value={formatCurrency(summary.cashRevenue)}
          note={`Thẻ ${formatCurrency(summary.cardRevenue)}`}
          color="#0756a6"
        />
        <StatCard
          label="Vé đã bán"
          value={formatNumber(summary.ticketsSold)}
          note={`${formatNumber(summary.checkedInTickets)} vé check-in hôm nay`}
          color="#f59e0b"
        />
        <StatCard
          label="Bắp nước"
          value={formatCurrency(summary.foodRevenue)}
          note={`${formatNumber(summary.pendingBookings)} đơn chờ, ${formatNumber(summary.refundRequests)} hoàn tiền`}
          color="#7c3aed"
        />
      </div>

      <div className="analytics-grid">
        <section className="analytics-card">
          <div className="analytics-card-header">
            <h3>Ca quầy</h3>
            <span>{activeShift ? 'Đang mở' : 'Chưa mở ca'}</span>
          </div>

          {activeShift ? (
            <form onSubmit={handleCloseShift} style={{ display: 'grid', gap: 14 }}>
              <div className="analytics-list">
                <div className="analytics-list-row">
                  <div className="analytics-list-main">
                    <strong>Mở ca</strong>
                    <span>{formatDateTime(activeShift.openedAt)}</span>
                  </div>
                  <div className="analytics-list-value">
                    <strong>{formatCurrency(activeShift.openingCash)}</strong>
                    <span>tiền đầu ca</span>
                  </div>
                </div>
                <div className="analytics-list-row">
                  <div className="analytics-list-main">
                    <strong>Tiền mặt dự kiến</strong>
                    <span>Tiền đầu ca + đơn tiền mặt đã bán</span>
                  </div>
                  <div className="analytics-list-value">
                    <strong>{formatCurrency(activeShift.expectedCash)}</strong>
                  </div>
                </div>
              </div>
              <label>
                <span className="form-label">Tiền mặt thực đếm</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                />
              </label>
              <label>
                <span className="form-label">Ghi chú đóng ca</span>
                <input
                  className="input"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="Lý do chênh lệch nếu có"
                />
              </label>
              <button className="btn btn-secondary" disabled={submittingShift}>
                {submittingShift ? 'Đang đóng...' : 'Đóng ca'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOpenShift} style={{ display: 'grid', gap: 14 }}>
              <label>
                <span className="form-label">Tiền đầu ca</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label>
                <span className="form-label">Ghi chú mở ca</span>
                <input
                  className="input"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="Ví dụ: nhận quầy số 1"
                />
              </label>
              <button className="btn btn-primary" disabled={submittingShift}>
                {submittingShift ? 'Đang mở...' : 'Mở ca'}
              </button>
            </form>
          )}
        </section>

        <section className="analytics-card">
          <div className="analytics-card-header">
            <h3>Suất chiếu sắp tới</h3>
            <Link to="/staff/booking" className="btn btn-ghost btn-sm">Xem quầy vé</Link>
          </div>
          {upcomingShowtimes.length === 0 ? (
            <div className="analytics-empty">Không có suất chiếu sắp tới.</div>
          ) : (
            <div className="analytics-list">
              {upcomingShowtimes.map((showtime) => (
                <div className="analytics-list-row" key={showtime.showtimeId}>
                  <div className="analytics-list-main">
                    <strong>{showtime.movieName}</strong>
                    <span>{showtime.roomName} - {formatDateTime(showtime.startTime)}</span>
                  </div>
                  <div className="analytics-list-value">
                    <strong>{formatNumber(showtime.availableSeats)}/{formatNumber(showtime.totalSeats)}</strong>
                    <span>ghế trống</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <h3>Lịch sử ca làm</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {shiftHistory.length} ca
          </span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ca</th>
              <th>Thời gian</th>
              <th>Doanh thu</th>
              <th>Tiền mặt</th>
              <th>Chênh lệch</th>
              <th>Đơn/Vé</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {shiftHistory.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Chưa có lịch sử ca làm.
                </td>
              </tr>
            ) : (
              shiftHistory.map((shift) => (
                <tr key={shift.shiftId}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>#{shift.shiftId}</td>
                  <td>
                    <div style={{ display: 'grid', gap: 3 }}>
                      <span>{formatDateTime(shift.openedAt)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {shift.closedAt ? `Đóng: ${formatDateTime(shift.closedAt)}` : 'Đang mở'}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {formatDuration(shift.durationMinutes)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 3 }}>
                      <strong>{formatCurrency(shift.totalSales)}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Thẻ/VNPay {formatCurrency(shift.cardSales)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 3 }}>
                      <span>Đầu ca: <strong>{formatCurrency(shift.openingCash)}</strong></span>
                      <span>Bán TM: <strong>{formatCurrency(shift.cashSales)}</strong></span>
                      <span>Dự kiến: <strong>{formatCurrency(shift.expectedCash)}</strong></span>
                      {shift.closingCash != null && (
                        <span>Thực đếm: <strong>{formatCurrency(shift.closingCash)}</strong></span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: Number(shift.cashDifference || 0) === 0 ? 'var(--text-primary)' : '#ef4444' }}>
                    {shift.cashDifference == null ? '-' : formatCurrency(shift.cashDifference)}
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 3 }}>
                      <span>{formatNumber(shift.paidBookings)} đơn</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {formatNumber(shift.ticketsSold)} vé
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${shift.status === 'OPEN' ? 'status--pending' : 'status--active'}`}>
                      {shift.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 180 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {shift.note || '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <h3>Đơn tại quầy gần đây</h3>
          <Link to="/staff/bookings" className="btn btn-ghost btn-sm">Xem đơn</Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Phim</th>
              <th>Ghế</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Chưa có đơn tại quầy.
                </td>
              </tr>
            ) : (
              recentBookings.map((booking) => (
                <tr key={booking.bookingId}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{booking.bookingCode}</td>
                  <td>{booking.movieName || '-'}</td>
                  <td>{booking.seatCodes?.join(', ') || '-'}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(booking.totalAmount)}</td>
                  <td>
                    <span className={`status-badge ${booking.status === 'COMPLETED' ? 'status--active' : 'status--pending'}`}>
                      {booking.status === 'COMPLETED' ? 'Thành công' : 'Chờ xử lý'}
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
}
