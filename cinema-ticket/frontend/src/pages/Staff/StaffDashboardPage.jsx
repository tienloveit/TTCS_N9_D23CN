import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { staffApi } from '../../api';
import {
  AlertTriangleIcon,
  ArmchairIcon,
  ArrowRightIcon,
  BanknoteIcon,
  CalculatorIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  FilmIcon,
  LockIcon,
  MapPinIcon,
  PopcornIcon,
  RefreshIcon,
  ReportIcon,
  ScanIcon,
  TicketIcon,
  UnlockIcon,
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
  activeShift: null,
  upcomingShowtimes: [],
  recentBookings: [],
};

const OPENING_CASH_PRESETS = [500000, 1000000, 2000000, 3000000, 5000000];

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

const formatDuration = (minutes) => {
  if (minutes == null) return '—';
  const total = Math.max(0, Math.round(Number(minutes)));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) return `${mins} phút`;
  return `${hours} giờ ${mins} phút`;
};

export default function StaffDashboardPage() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [openingCash, setOpeningCash] = useState('1000000');
  const [closingCash, setClosingCash] = useState('');
  const [shiftNote, setShiftNote] = useState('');
  const [shiftHistory, setShiftHistory] = useState([]);
  const [submittingShift, setSubmittingShift] = useState(false);

  // Bottom tabs: 'BOOKINGS' | 'SHIFTS'
  const [bottomTab, setBottomTab] = useState('BOOKINGS');
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [res, historyRes] = await Promise.all([
        staffApi.getDashboard(),
        staffApi.getShiftHistory(),
      ]);
      const data = res.data.result || emptyDashboard;
      setDashboard(data);
      setShiftHistory(historyRes.data.result || []);
      if (data.activeShift) {
        setClosingCash(String(data.activeShift.expectedCash ?? 0));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tải được dữ liệu tổng quan ca làm');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenShift = async (event) => {
    event.preventDefault();
    setSubmittingShift(true);
    try {
      await staffApi.openShift({
        openingCash: Number(openingCash || 0),
        note: shiftNote.trim(),
      });
      setShiftNote('');
      toast.success('Đã mở ca làm việc mới!');
      await loadDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không mở được ca làm');
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
        note: shiftNote.trim(),
      });
      setShiftNote('');
      toast.success('Đã chốt và đóng ca làm việc!');
      await loadDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không đóng được ca làm');
    } finally {
      setSubmittingShift(false);
    }
  };

  const summary = dashboard.summary || emptyDashboard.summary;
  const activeShift = dashboard.activeShift;
  const upcomingShowtimes = dashboard.upcomingShowtimes || [];
  const recentBookings = dashboard.recentBookings || [];

  const liveShiftMinutes = useMemo(() => {
    if (!activeShift?.openedAt) return null;
    const openedMs = new Date(activeShift.openedAt).getTime();
    if (Number.isNaN(openedMs)) return activeShift.durationMinutes;
    return Math.max(1, Math.floor((nowTick - openedMs) / 60000));
  }, [activeShift, nowTick]);

  const cashDiff = useMemo(() => {
    if (!activeShift) return 0;
    const expected = Number(activeShift.expectedCash || 0);
    const counted = Number(closingCash || 0);
    return counted - expected;
  }, [activeShift, closingCash]);

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
    <div className="shift-page">
      {/* ===== 1. SHIFT COMMAND BAR ===== */}
      <div className="shift-top-bar">
        <div className="pos-top-bar-left">
          <span
            className="pos-badge-live"
            style={
              activeShift
                ? undefined
                : {
                    background: 'rgba(245, 158, 11, 0.14)',
                    color: '#d97706',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                  }
            }
          >
            <span
              className="pos-badge-live-dot"
              style={activeShift ? undefined : { background: '#f59e0b' }}
            />
            {activeShift ? `Ca #${activeShift.shiftId} • Đang mở` : 'Chưa mở ca quầy'}
          </span>

          <div className="pos-top-title">
            <h1>Trung tâm điều hành ca trực (Shift Workstation)</h1>
            <p>
              {activeShift
                ? `Mở lúc ${formatDateTime(activeShift.openedAt)} • Thời lượng trực: ${formatDuration(
                    liveShiftMinutes
                  )}`
                : 'Vui lòng nhập tiền mặt đầu ca để bắt đầu ghi nhận doanh số quầy POS'}
            </p>
          </div>
        </div>

        <div className="shift-top-actions">
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
            <span>Cổng Check-in</span>
          </Link>

          <Link
            to="/staff/booking"
            className="btn btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.86rem' }}
          >
            <TicketIcon size={16} />
            <span>Bán vé tại quầy (POS)</span>
          </Link>
        </div>
      </div>

      {/* ===== 2. 4 KPI METRIC CARDS ===== */}
      <div className="shift-kpi-grid">
        <div className="shift-kpi-card">
          <div className="shift-kpi-head">
            <span className="shift-kpi-label">Tổng doanh thu ca</span>
            <div
              className="shift-kpi-icon"
              style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}
            >
              <ReportIcon size={20} />
            </div>
          </div>
          <h3 className="shift-kpi-value" style={{ color: '#15803d' }}>
            {formatCurrency(summary.revenue)}
          </h3>
          <div className="shift-kpi-sub">
            <span>Đơn hoàn tất:</span>
            <strong style={{ color: '#0f172a' }}>{formatNumber(summary.paidBookings)} đơn</strong>
          </div>
        </div>

        <div className="shift-kpi-card">
          <div className="shift-kpi-head">
            <span className="shift-kpi-label">Tiền mặt tại két</span>
            <div
              className="shift-kpi-icon"
              style={{ background: 'rgba(7, 86, 166, 0.12)', color: '#0756a6' }}
            >
              <BanknoteIcon size={20} />
            </div>
          </div>
          <h3 className="shift-kpi-value">{formatCurrency(summary.cashRevenue)}</h3>
          <div className="shift-kpi-sub">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CreditCardIcon size={13} /> Thẻ / VNPay:
            </span>
            <strong style={{ color: '#0756a6' }}>{formatCurrency(summary.cardRevenue)}</strong>
          </div>
        </div>

        <div className="shift-kpi-card">
          <div className="shift-kpi-head">
            <span className="shift-kpi-label">Vé bán & Soát cổng</span>
            <div
              className="shift-kpi-icon"
              style={{ background: 'rgba(245, 158, 11, 0.14)', color: '#d97706' }}
            >
              <TicketIcon size={20} />
            </div>
          </div>
          <h3 className="shift-kpi-value">
            {formatNumber(summary.ticketsSold)}{' '}
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b' }}>vé</span>
          </h3>
          <div className="shift-kpi-sub">
            <span>Đã check-in hôm nay:</span>
            <strong style={{ color: '#d97706' }}>
              {formatNumber(summary.checkedInTickets)} vé ({checkInRate}%)
            </strong>
          </div>
        </div>

        <div className="shift-kpi-card">
          <div className="shift-kpi-head">
            <span className="shift-kpi-label">Doanh thu Bắp nước (F&B)</span>
            <div
              className="shift-kpi-icon"
              style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}
            >
              <PopcornIcon size={20} />
            </div>
          </div>
          <h3 className="shift-kpi-value">{formatCurrency(summary.foodRevenue)}</h3>
          <div className="shift-kpi-sub">
            <span>Chờ thanh toán / Hoàn vé:</span>
            <strong style={{ color: summary.refundRequests > 0 ? '#dc2626' : '#0f172a' }}>
              {formatNumber(summary.pendingBookings)} chờ • {formatNumber(summary.refundRequests)} hoàn
            </strong>
          </div>
        </div>
      </div>

      {/* ===== 3. 2-COLUMN WORKSPACE: CASH REGISTER & UPCOMING SHOWTIMES ===== */}
      <div className="shift-workspace">
        {/* LEFT: CASH DRAWER & SHIFT RECONCILIATION */}
        <section className="shift-card">
          <div className="shift-card-header">
            <div className="shift-card-title">
              <CalculatorIcon size={20} style={{ color: '#0756a6' }} />
              <h3>Két tiền mặt & Bàn giao ca quầy</h3>
            </div>
            <span
              className={`shift-status-pill ${
                activeShift ? 'shift-status-pill--open' : 'shift-status-pill--closed'
              }`}
            >
              {activeShift ? (
                <>
                  <UnlockIcon size={14} />
                  <span>Đang mở ca #{activeShift.shiftId}</span>
                </>
              ) : (
                <>
                  <LockIcon size={14} />
                  <span>Chưa mở ca</span>
                </>
              )}
            </span>
          </div>

          {activeShift ? (
            <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="shift-ledger-grid">
                <div className="shift-ledger-box">
                  <small>Tiền đầu ca</small>
                  <strong>{formatCurrency(activeShift.openingCash)}</strong>
                </div>
                <div className="shift-ledger-box">
                  <small>Thu tiền mặt</small>
                  <strong style={{ color: '#16a34a' }}>
                    +{formatCurrency(activeShift.cashSales)}
                  </strong>
                </div>
                <div
                  className="shift-ledger-box"
                  style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}
                >
                  <small style={{ color: '#1e40af' }}>Tiền dự kiến trong két</small>
                  <strong style={{ color: '#0756a6' }}>
                    {formatCurrency(activeShift.expectedCash)}
                  </strong>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span className="form-label" style={{ margin: 0 }}>
                    Tiền mặt thực đếm cuối ca (VND)
                  </span>
                  <button
                    type="button"
                    className="shift-cash-chip"
                    onClick={() => setClosingCash(String(activeShift.expectedCash || 0))}
                  >
                    Khớp đúng dự kiến ({formatCurrency(activeShift.expectedCash)})
                  </button>
                </div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="Nhập tổng tiền mặt thực đếm trong ngăn kéo..."
                  required
                />
              </div>

              {/* Real-time Cash Discrepancy Indicator */}
              <div
                className={`shift-diff-banner ${
                  cashDiff === 0 ? 'shift-diff-banner--match' : 'shift-diff-banner--warn'
                }`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {cashDiff === 0 ? (
                    <>
                      <CheckCircleIcon size={18} />
                      <span>Két tiền mặt cân bằng tuyệt đối (Chênh lệch: 0 ₫)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangleIcon size={18} />
                      <span>
                        {cashDiff > 0 ? 'Thừa tiền mặt so với sổ:' : 'Thiếu hụt tiền mặt so với sổ:'}
                      </span>
                    </>
                  )}
                </span>
                {cashDiff !== 0 && (
                  <strong style={{ fontSize: '0.96rem' }}>
                    {cashDiff > 0 ? `+${formatCurrency(cashDiff)}` : formatCurrency(cashDiff)}
                  </strong>
                )}
              </div>

              <label>
                <span className="form-label">Ghi chú bàn giao / giải trình chênh lệch</span>
                <input
                  className="input"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="VD: Bàn giao ca chiều, đủ hóa đơn chứng từ..."
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}
                  disabled={submittingShift}
                >
                  <LockIcon size={16} />
                  <span>{submittingShift ? 'Đang chốt ca...' : 'Chốt sổ & Đóng ca làm việc'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.84rem',
                  color: '#475569',
                }}
              >
                Kiểm đếm tiền lẻ tồn đầu ca trong ngăn kéo trước khi nhận quầy bán vé.
              </div>

              <div>
                <span className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                  Tiền mặt đầu ca (VND)
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0"
                  required
                />
                <div className="shift-cash-presets" style={{ marginTop: 8 }}>
                  {OPENING_CASH_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="shift-cash-chip"
                      onClick={() => setOpeningCash(String(amount))}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <label>
                <span className="form-label">Ghi chú nhận ca</span>
                <input
                  className="input"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="VD: Nhận bàn giao quầy POS số 01 - Ca sáng"
                />
              </label>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}
                disabled={submittingShift}
              >
                <UnlockIcon size={16} />
                <span>{submittingShift ? 'Đang mở ca...' : 'Xác nhận Mở ca làm việc'}</span>
              </button>
            </form>
          )}
        </section>

        {/* RIGHT: UPCOMING SHOWTIMES RADAR */}
        <section className="shift-card">
          <div className="shift-card-header">
            <div className="shift-card-title">
              <FilmIcon size={20} style={{ color: '#ea580c' }} />
              <h3>Radar suất chiếu sắp mở cổng ({upcomingShowtimes.length})</h3>
            </div>
            <Link to="/staff/booking" className="btn btn-ghost btn-sm">
              <span>Mở POS bán vé</span>
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
            <div className="shift-showtime-list">
              {upcomingShowtimes.map((showtime) => {
                const total = Math.max(1, Number(showtime.totalSeats || 0));
                const available = Math.max(0, Number(showtime.availableSeats || 0));
                const sold = Math.max(0, total - available);
                const occupancyPct = Math.min(100, Math.round((sold / total) * 100));
                const fillColor =
                  occupancyPct >= 85 ? '#dc2626' : occupancyPct >= 50 ? '#f59e0b' : '#0756a6';

                return (
                  <div className="shift-showtime-item" key={showtime.showtimeId}>
                    <div className="shift-showtime-top">
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

                    <div className="shift-occupancy-bar">
                      <div
                        className="shift-occupancy-fill"
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

      {/* ===== 4. TABBED ACTIVITY & SHIFT HISTORY LOGS ===== */}
      <section className="shift-card">
        <div className="shift-card-header">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`pos-time-pill ${bottomTab === 'BOOKINGS' ? 'pos-time-pill--active' : ''}`}
              onClick={() => setBottomTab('BOOKINGS')}
            >
              <TicketIcon size={15} />
              <span>Đơn tại quầy gần đây ({recentBookings.length})</span>
            </button>
            <button
              type="button"
              className={`pos-time-pill ${bottomTab === 'SHIFTS' ? 'pos-time-pill--active' : ''}`}
              onClick={() => setBottomTab('SHIFTS')}
            >
              <CalendarIcon size={15} />
              <span>Lịch sử bàn giao ca ({shiftHistory.length})</span>
            </button>
          </div>

          {bottomTab === 'BOOKINGS' && (
            <Link to="/staff/bookings" className="btn btn-ghost btn-sm">
              <span>Xem tất cả đơn đặt vé</span>
              <ArrowRightIcon size={14} />
            </Link>
          )}
        </div>

        {bottomTab === 'BOOKINGS' ? (
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
                      Chưa có đơn bán vé nào phát sinh trong ca hiện tại.
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
        ) : (
          <div className="admin-table-card" style={{ borderRadius: 12 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã ca</th>
                  <th>Thời gian trực</th>
                  <th>Tổng doanh số</th>
                  <th>Đối soát tiền mặt</th>
                  <th>Chênh lệch</th>
                  <th>Sản lượng</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {shiftHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}
                    >
                      Chưa có lịch sử ca làm việc nào.
                    </td>
                  </tr>
                ) : (
                  shiftHistory.map((shift) => {
                    const diff = Number(shift.cashDifference || 0);
                    return (
                      <tr key={shift.shiftId}>
                        <td style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0756a6' }}>
                          #{shift.shiftId}
                        </td>
                        <td>
                          <div style={{ display: 'grid', gap: 2 }}>
                            <span style={{ fontWeight: 600 }}>Mở: {formatDateTime(shift.openedAt)}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.77rem' }}>
                              {shift.closedAt ? `Đóng: ${formatDateTime(shift.closedAt)}` : 'Đang mở trực'}
                            </span>
                            <span style={{ color: '#0756a6', fontSize: '0.76rem', fontWeight: 700 }}>
                              Thời lượng: {formatDuration(shift.durationMinutes)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'grid', gap: 2 }}>
                            <strong style={{ color: '#0f172a' }}>{formatCurrency(shift.totalSales)}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.77rem' }}>
                              Thẻ/VNPay: {formatCurrency(shift.cardSales)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'grid', gap: 2, fontSize: '0.82rem' }}>
                            <span>
                              Đầu ca: <strong>{formatCurrency(shift.openingCash)}</strong>
                            </span>
                            <span>
                              Thu TM: <strong style={{ color: '#16a34a' }}>+{formatCurrency(shift.cashSales)}</strong>
                            </span>
                            <span>
                              Dự kiến: <strong>{formatCurrency(shift.expectedCash)}</strong>
                            </span>
                            {shift.closingCash != null && (
                              <span>
                                Thực đếm: <strong>{formatCurrency(shift.closingCash)}</strong>
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            fontWeight: 800,
                            color: diff === 0 ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {shift.cashDifference == null
                            ? '—'
                            : diff === 0
                            ? 'Khớp (0 ₫)'
                            : diff > 0
                            ? `+${formatCurrency(diff)}`
                            : formatCurrency(diff)}
                        </td>
                        <td>
                          <div style={{ display: 'grid', gap: 2 }}>
                            <strong>{formatNumber(shift.paidBookings)} đơn</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.77rem' }}>
                              {formatNumber(shift.ticketsSold)} vé xuất
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              shift.status === 'OPEN' ? 'status--pending' : 'status--active'
                            }`}
                          >
                            {shift.status === 'OPEN' ? 'Đang mở' : 'Đã chốt'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                            {shift.note || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
