import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { branchApi, operationsApi, reportsApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import {
  AlertTriangleIcon,
  BanknoteIcon,
  DownloadIcon,
  RefreshIcon,
  SparkIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';

const today = () => new Date().toISOString().slice(0, 10);

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-';

const OperationsReportPage = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      return;
    }
    branchApi.getAll()
      .then((res) => setBranches(res.data.result || []))
      .catch(() => setBranches([]));
  }, [user?.role]);

  const fetchReport = useCallback(() => {
    setLoading(true);
    operationsApi.getDailyReport({ date, branchId: branchId || undefined })
      .then((res) => {
        setReport(res.data.result);
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Không thể tải báo cáo vận hành');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [date, branchId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = report?.summary || {};
  const statCards = useMemo(() => [
    {
      label: 'Doanh thu trong ngày',
      value: formatCurrency(summary.revenue),
      note: `${formatNumber(summary.completedBookings)} đơn hoàn tất`,
      icon: SparkIcon,
      color: '#16a34a',
    },
    {
      label: 'Tiền mặt dự kiến',
      value: formatCurrency(summary.expectedCash),
      note: `Chênh lệch ${formatCurrency(summary.cashDifference)}`,
      icon: BanknoteIcon,
      color: Number(summary.cashDifference || 0) !== 0 ? '#dc2626' : '#0756a6',
    },
    {
      label: 'Vé đã bán',
      value: formatNumber(summary.ticketsSold),
      note: `Lấp đầy ${Number(summary.occupancyRate || 0).toFixed(1)}%`,
      icon: TicketIcon,
      color: '#7c3aed',
    },
    {
      label: 'Cảnh báo cần xử lý',
      value: formatNumber(summary.refundRequests),
      note: 'Yêu cầu hoàn tiền chờ xử lý',
      icon: AlertTriangleIcon,
      color: '#d97706',
    },
  ], [summary]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await reportsApi.exportOperations({ date, branchId: branchId || undefined });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `operations-report-${date}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel báo cáo vận hành');
    } catch {
      toast.error('Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Báo cáo vận hành</h1>
          <p className="page-subtitle">Đối soát doanh thu, ca làm, tồn kho và yêu cầu hoàn tiền theo ngày.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`pos-time-pill ${date === today() ? 'pos-time-pill--active' : ''}`}
            onClick={() => setDate(today())}
          >
            Hôm nay
          </button>
          <input className="input" style={{ width: 'auto' }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {user?.role === 'ADMIN' && (
            <select className="input" style={{ width: 'auto' }} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-secondary" onClick={fetchReport} disabled={loading}>
            <RefreshIcon size={16} />
            <span>Làm mới</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
            <DownloadIcon size={16} />
            <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        {statCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className="stat-icon" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
              {createElement(card.icon, { size: 22 })}
            </div>
            <div className="stat-info">
              <span className="stat-label">{card.label}</span>
              <h3 className="stat-value">{loading ? '...' : card.value}</h3>
              <span className="stat-note">{card.note}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <ReportTable
          title="Đối soát thanh toán"
          headers={['Phương thức', 'Số đơn', 'Doanh thu']}
          rows={(report?.paymentBreakdown || []).map((item) => [
            <strong key="m">{item.paymentMethod || '-'}</strong>,
            formatNumber(item.bookings),
            <strong key="a" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount)}</strong>,
          ])}
        />
        <ReportTable
          title="Yêu cầu hoàn tiền chờ duyệt"
          headers={['Mã đơn', 'Khách hàng', 'Số tiền', 'Lý do']}
          rows={(report?.refundQueue || []).map((item) => [
            <span key="c" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.bookingCode}</span>,
            item.customerName || '-',
            <strong key="amt" style={{ color: '#dc2626' }}>{formatCurrency(item.amount)}</strong>,
            item.reason || '-',
          ])}
        />
      </div>

      <div className="analytics-grid">
        <ReportTable
          title="Ca làm trong ngày"
          headers={['Nhân viên', 'Mở ca', 'Đóng ca', 'Tiền dự kiến', 'Chênh lệch']}
          rows={(report?.staffShifts || []).map((item) => {
            const diff = Number(item.cashDifference || 0);
            return [
              <strong key="st">{item.staffName || '-'}</strong>,
              formatDateTime(item.openedAt),
              item.closedAt ? formatDateTime(item.closedAt) : <span key="op" className="status-badge status--pending">Đang mở</span>,
              formatCurrency(item.expectedCash),
              <strong key="df" style={{ color: diff === 0 ? '#16a34a' : '#dc2626' }}>
                {diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
              </strong>,
            ];
          })}
        />

      </div>

      <ReportTable
        title="Tải suất chiếu trong ngày"
        headers={['Phim', 'Phòng', 'Giờ chiếu', 'Vé bán', 'Tỷ lệ lấp đầy']}
        rows={(report?.showtimeLoads || []).map((item) => {
          const occ = Number(item.occupancyRate || 0);
          const fillClass = occ >= 70 ? 'is-high' : occ >= 35 ? '' : 'is-warn';
          return [
            <strong key="mv">{item.movieName}</strong>,
            item.roomName,
            formatDateTime(item.startTime),
            `${formatNumber(item.ticketsSold)} / ${formatNumber(item.capacity)}`,
            <div key="occ" className="mini-progress-wrap">
              <div className="mini-progress-track">
                <div className={`mini-progress-fill ${fillClass}`} style={{ width: `${Math.min(occ, 100)}%` }} />
              </div>
              <strong style={{ fontSize: '0.82rem', minWidth: 44, textAlign: 'right' }}>
                {occ.toFixed(1)}%
              </strong>
            </div>,
          ];
        })}
      />
    </div>
  );
};

const ReportTable = ({ title, headers, rows }) => (
  <section className="admin-table-card">
    <div className="table-header">
      <h3 className="section-title">{title}</h3>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rows.length} dòng</span>
    </div>
    <table className="admin-table">
      <thead>
        <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
        ) : (
          rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          ))
        )}
      </tbody>
    </table>
  </section>
);

export default OperationsReportPage;

