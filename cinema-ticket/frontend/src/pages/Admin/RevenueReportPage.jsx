import { useEffect, useMemo, useState } from 'react';
import { branchApi, movieApi, reportsApi, userApi } from '../../api';
import { useAuth } from '../../context/useAuth';

const dateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(amount || 0));

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const RevenueReportPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    from: dateDaysAgo(29),
    to: dateDaysAgo(0),
    branchId: '',
    movieId: '',
    staffId: '',
    paymentMethod: '',
  });
  const [report, setReport] = useState(null);
  const [branches, setBranches] = useState([]);
  const [movies, setMovies] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      user?.role === 'ADMIN' ? branchApi.getAll() : Promise.resolve({ data: { result: [] } }),
      movieApi.getAll({ size: 1000 }),
      userApi.getAll({ size: 1000 }),
    ]).then(([branchRes, movieRes, userRes]) => {
      setBranches(branchRes.data.result || []);
      const movieResult = movieRes.data.result;
      setMovies(Array.isArray(movieResult) ? movieResult : movieResult?.data || []);
      const users = userRes.data.result?.data || userRes.data.result || [];
      setStaff(users.filter((item) => item.role === 'STAFF'));
    }).catch(() => {});
  }, [user?.role]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    reportsApi.getRevenue(params)
      .then((res) => {
        if (!active) return;
        setReport(res.data.result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const summary = report?.summary || {};
  const cards = useMemo(() => [
    ['Doanh thu', formatCurrency(summary.revenue), `${formatNumber(summary.bookings)} đơn`],
    ['Vé', formatCurrency(summary.ticketRevenue), `${formatNumber(summary.ticketsSold)} vé`],
    ['Bắp nước', formatCurrency(summary.foodRevenue), 'Doanh thu phụ trợ'],
    ['AOV', formatCurrency(summary.averageOrderValue), 'Giá trị đơn trung bình'],
  ], [summary]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const exportExcel = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    const res = await reportsApi.exportRevenue(params);
    const url = URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'revenue-report.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Doanh thu chi tiết</h1>
          <p className="page-subtitle">Lọc doanh thu theo chi nhánh, phim, nhân viên, phương thức thanh toán và khoảng ngày.</p>
        </div>
        <button className="btn btn-primary" onClick={exportExcel}>Xuất Excel</button>
      </div>

      <div className="admin-table-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <input className="input" type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
          <input className="input" type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
          {user?.role === 'ADMIN' && (
            <select className="input" value={filters.branchId} onChange={(e) => updateFilter('branchId', e.target.value)}>
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
            </select>
          )}
          <select className="input" value={filters.movieId} onChange={(e) => updateFilter('movieId', e.target.value)}>
            <option value="">Tất cả phim</option>
            {movies.map((movie) => <option key={movie.movieId || movie.id} value={movie.movieId || movie.id}>{movie.movieName}</option>)}
          </select>
          <select className="input" value={filters.staffId} onChange={(e) => updateFilter('staffId', e.target.value)}>
            <option value="">Online + mọi nhân viên</option>
            {staff.map((item) => <option key={item.id} value={item.id}>{item.fullName || item.username}</option>)}
          </select>
          <select className="input" value={filters.paymentMethod} onChange={(e) => updateFilter('paymentMethod', e.target.value)}>
            <option value="">Mọi thanh toán</option>
            <option value="CASH">Tiền mặt</option>
            <option value="CARD">Thẻ</option>
            <option value="VNPAY">VNPAY</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map(([label, value, note]) => (
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
        <BreakdownTable title="Theo chi nhánh" rows={report?.branchBreakdown || []} />
        <BreakdownTable title="Theo phim" rows={report?.movieBreakdown || []} />
      </div>
      <div className="analytics-grid">
        <BreakdownTable title="Theo nhân viên" rows={report?.staffBreakdown || []} />
        <PaymentTable rows={report?.paymentBreakdown || []} />
      </div>

      <section className="admin-table-card">
        <div className="table-header"><h3 className="section-title">Giao dịch</h3></div>
        <table className="admin-table">
          <thead>
            <tr><th>Thời gian</th><th>Mã đơn</th><th>Chi nhánh</th><th>Phim</th><th>Nhân viên</th><th>Thanh toán</th><th>Vé</th><th>Bắp nước</th><th>Tổng</th></tr>
          </thead>
          <tbody>
            {(report?.rows || []).length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: 32 }}>Không có giao dịch</td></tr>
            ) : report.rows.map((row) => (
              <tr key={row.bookingId}>
                <td>{formatDateTime(row.paidAt)}</td>
                <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.bookingCode}</td>
                <td>{row.branchName || '-'}</td>
                <td>{row.movieName || '-'}</td>
                <td>{row.staffUsername || 'Online'}</td>
                <td>{row.paymentMethod || '-'}</td>
                <td>{formatCurrency(row.ticketAmount)}</td>
                <td>{formatCurrency(row.foodAmount)}</td>
                <td>{formatCurrency(row.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

const BreakdownTable = ({ title, rows }) => (
  <section className="admin-table-card">
    <div className="table-header"><h3 className="section-title">{title}</h3></div>
    <table className="admin-table">
      <thead><tr><th>Tên</th><th>Đơn</th><th>Vé</th><th>Doanh thu</th></tr></thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan="4" style={{ textAlign: 'center', padding: 28 }}>Chưa có dữ liệu</td></tr>
        ) : rows.map((row) => (
          <tr key={`${title}-${row.id || row.name}`}>
            <td>{row.name}</td>
            <td>{formatNumber(row.bookings)}</td>
            <td>{formatNumber(row.ticketsSold)}</td>
            <td>{formatCurrency(row.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const PaymentTable = ({ rows }) => (
  <section className="admin-table-card">
    <div className="table-header"><h3 className="section-title">Theo thanh toán</h3></div>
    <table className="admin-table">
      <thead><tr><th>Phương thức</th><th>Đơn</th><th>Doanh thu</th></tr></thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan="3" style={{ textAlign: 'center', padding: 28 }}>Chưa có dữ liệu</td></tr>
        ) : rows.map((row) => (
          <tr key={row.paymentMethod}>
            <td>{row.paymentMethod}</td>
            <td>{formatNumber(row.bookings)}</td>
            <td>{formatCurrency(row.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

export default RevenueReportPage;
