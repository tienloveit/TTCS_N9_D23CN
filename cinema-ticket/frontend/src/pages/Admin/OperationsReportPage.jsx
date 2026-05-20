import { useEffect, useMemo, useState } from 'react';
import { branchApi, operationsApi } from '../../api';
import { useAuth } from '../../context/useAuth';

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
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      return;
    }
    branchApi.getAll()
      .then((res) => setBranches(res.data.result || []))
      .catch(() => setBranches([]));
  }, [user?.role]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    operationsApi.getDailyReport({ date, branchId: branchId || undefined })
      .then((res) => {
        if (!active) return;
        setReport(res.data.result);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Không thể tải báo cáo vận hành');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, branchId]);

  const summary = report?.summary || {};
  const statCards = useMemo(() => [
    ['Doanh thu', formatCurrency(summary.revenue), `${formatNumber(summary.completedBookings)} đơn hoàn tất`],
    ['Tiền mặt dự kiến', formatCurrency(summary.expectedCash), `Chênh lệch ${formatCurrency(summary.cashDifference)}`],
    ['Vé đã bán', formatNumber(summary.ticketsSold), `Lấp đầy ${Number(summary.occupancyRate || 0).toFixed(1)}%`],
    ['Cần xử lý', formatNumber(summary.refundRequests), `${formatNumber(summary.lowStockItems)} món sắp hết`],
  ], [summary]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Báo cáo vận hành</h1>
          <p className="page-subtitle">Đối soát doanh thu, ca làm, tồn kho và yêu cầu hoàn tiền theo ngày.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {user?.role === 'ADMIN' && (
            <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-grid">
        {statCards.map(([label, value, note]) => (
          <div className="stat-card" key={label}>
            <div className="stat-info">
              <span className="stat-label">{label}</span>
              <h3 className="stat-value">{loading ? '...' : value}</h3>
              <span className="stat-note">{note}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <ReportTable
          title="Đối soát thanh toán"
          headers={['Phương thức', 'Số đơn', 'Doanh thu']}
          rows={(report?.paymentBreakdown || []).map((item) => [
            item.paymentMethod || '-',
            formatNumber(item.bookings),
            formatCurrency(item.amount),
          ])}
        />
        <ReportTable
          title="Yêu cầu hoàn tiền"
          headers={['Mã đơn', 'Khách hàng', 'Số tiền', 'Lý do']}
          rows={(report?.refundQueue || []).map((item) => [
            item.bookingCode,
            item.customerName || '-',
            formatCurrency(item.amount),
            item.reason || '-',
          ])}
        />
      </div>

      <div className="analytics-grid">
        <ReportTable
          title="Ca làm trong ngày"
          headers={['Nhân viên', 'Mở ca', 'Đóng ca', 'Tiền dự kiến', 'Chênh lệch']}
          rows={(report?.staffShifts || []).map((item) => [
            item.staffName || '-',
            formatDateTime(item.openedAt),
            formatDateTime(item.closedAt),
            formatCurrency(item.expectedCash),
            formatCurrency(item.cashDifference),
          ])}
        />
        <ReportTable
          title="Tồn kho cần nhập"
          headers={['Sản phẩm', 'Tồn', 'Ngưỡng', 'Trạng thái']}
          rows={(report?.lowStockFoods || []).map((item) => [
            item.foodName,
            formatNumber(item.stockQuantity),
            formatNumber(item.lowStockThreshold),
            item.active === false ? 'Ngừng bán' : 'Đang bán',
          ])}
        />
      </div>

      <ReportTable
        title="Tải suất chiếu"
        headers={['Phim', 'Phòng', 'Giờ chiếu', 'Vé bán', 'Lấp đầy']}
        rows={(report?.showtimeLoads || []).map((item) => [
          item.movieName,
          item.roomName,
          formatDateTime(item.startTime),
          `${formatNumber(item.ticketsSold)} / ${formatNumber(item.capacity)}`,
          `${Number(item.occupancyRate || 0).toFixed(1)}%`,
        ])}
      />
    </div>
  );
};

const ReportTable = ({ title, headers, rows }) => (
  <section className="admin-table-card">
    <div className="table-header">
      <h3 className="section-title">{title}</h3>
    </div>
    <table className="admin-table">
      <thead>
        <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={headers.length} style={{ textAlign: 'center', padding: 28 }}>Chưa có dữ liệu</td></tr>
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
