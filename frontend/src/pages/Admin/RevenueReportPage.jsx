import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { branchApi, movieApi, reportsApi, userApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { DownloadIcon, RotateCcwIcon } from '../../components/Common/CinemaIcons';
import { SkeletonBox } from '../../components/Common/Skeleton';
import './RevenueReportPage.css';
import { formatCinema } from '../../utils/cinemaTime';

const businessDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const dateDaysAgo = (days) => {
  const date = new Date(businessDate.format(new Date()));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
};

const firstDayOfMonth = (today) => `${today.slice(0, 7)}-01`;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(amount || 0));

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
const formatDateTime = (value) => formatCinema(value, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric' }, '-');
const shareFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 });
const paymentLabels = { CASH: 'Tiền mặt', CARD: 'Thẻ', VNPAY: 'VNPay' };
const groups = [
  { key: 'movieBreakdown', label: 'Phim' },
  { key: 'branchBreakdown', label: 'Chi nhánh' },
  { key: 'staffBreakdown', label: 'Nhân viên' },
  { key: 'paymentBreakdown', label: 'Thanh toán' },
];

const DEFAULT_FILTERS = () => ({
  from: dateDaysAgo(29),
  to: dateDaysAgo(0),
  branchId: '',
  movieId: '',
  staffId: '',
  paymentMethod: '',
});

const RevenueReportPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [group, setGroup] = useState(groups[0]);
  const [response, setResponse] = useState(null);
  const [branches, setBranches] = useState([]);
  const [movies, setMovies] = useState([]);
  const [staff, setStaff] = useState([]);
  const [exporting, setExporting] = useState(false);
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;
  const currentResponse = response?.filters === filters ? response : null;
  const report = currentResponse?.report;
  const loading = !currentResponse && !rangeInvalid;

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      isAdmin ? branchApi.getAll() : Promise.resolve({ data: { result: [] } }),
      movieApi.getAll({ size: 1000 }),
      userApi.getAll({ size: 1000 }),
    ]).then(([branchRes, movieRes, userRes]) => {
      if (!active) return;
      setBranches(branchRes.value?.data.result || []);
      const movieResult = movieRes.value?.data.result;
      setMovies(Array.isArray(movieResult) ? movieResult : movieResult?.data || []);
      const users = userRes.value?.data.result?.data || userRes.value?.data.result || [];
      setStaff(users.filter((item) => item.role === 'STAFF'));
    });
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => {
    if (rangeInvalid) return;
    let active = true;
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    reportsApi.getRevenue(params)
      .then((res) => {
        if (active) setResponse({ filters, report: res.data.result });
      })
      .catch((err) => {
        if (active) {
          setResponse({ filters, error: err.response?.data?.message || 'Không thể tải báo cáo doanh thu.' });
        }
      });
    return () => {
      active = false;
    };
  }, [filters, rangeInvalid]);

  const summary = report?.summary || {};
  const cards = [
    {
      label: 'Tổng doanh thu',
      value: formatCurrency(summary.revenue),
      note: `${formatNumber(summary.bookings)} đơn hoàn tất`,
    },
    {
      label: 'Doanh thu vé',
      value: formatCurrency(summary.ticketRevenue),
      note: `${formatNumber(summary.ticketsSold)} vé đã bán`,
    },
    {
      label: 'Doanh thu bắp nước',
      value: formatCurrency(summary.foodRevenue),
    },
    {
      label: 'Giá trị đơn trung bình',
      value: formatCurrency(summary.averageOrderValue),
    },
  ];

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const today = dateDaysAgo(0);
  const presets = [
    { label: 'Hôm nay', from: today },
    { label: '7 ngày', from: dateDaysAgo(6) },
    { label: '30 ngày', from: dateDaysAgo(29) },
    { label: 'Tháng này', from: firstDayOfMonth(today) },
  ];
  const activePreset = filters.to === today && presets.find(({ from }) => from === filters.from);
  const applyPreset = (from) => setFilters((prev) => ({ ...prev, from, to: today }));

  const exportExcel = async () => {
    setExporting(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
      const res = await reportsApi.exportRevenue(params);
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `revenue-report-${filters.from}-to-${filters.to}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel doanh thu chi tiết');
    } catch {
      toast.error('Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };


  const transactionRows = report?.rows || [];
  const breakdownRows = report?.[group.key] || [];
  const error = rangeInvalid ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : currentResponse?.error;

  return (
    <div className="revenue-report">
      <header className="revenue-heading">
        <h1>Doanh thu chi tiết</h1>
        <button type="button" className="revenue-button revenue-button--primary" onClick={exportExcel} disabled={exporting || rangeInvalid}>
          <DownloadIcon size={16} aria-hidden="true" />
          {exporting ? 'Đang xuất…' : 'Xuất Excel'}
        </button>
      </header>

      <section className="revenue-filters" aria-label="Bộ lọc doanh thu">
        <div className="revenue-filter-period">
          <div className="revenue-date-fields">
            <label>
              Từ ngày
              <input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} />
            </label>
            <label>
              Đến ngày
              <input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} />
            </label>
          </div>
          <div className="revenue-presets" role="group" aria-label="Khoảng ngày nhanh">
            {presets.map((preset) => (
              <button key={preset.label} type="button" aria-pressed={activePreset === preset} onClick={() => applyPreset(preset.from)}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="revenue-filter-details" data-branch-filter={isAdmin || undefined}>
          {isAdmin && (
            <div className="revenue-field">
              <label htmlFor="revenue-branch">Chi nhánh</label>
              <select id="revenue-branch" value={filters.branchId} onChange={(event) => updateFilter('branchId', event.target.value)}>
                <option value="">Tất cả chi nhánh</option>
                {branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
              </select>
            </div>
          )}
          <div className="revenue-field">
            <label htmlFor="revenue-movie">Phim</label>
            <select id="revenue-movie" value={filters.movieId} onChange={(event) => updateFilter('movieId', event.target.value)}>
              <option value="">Tất cả phim</option>
              {movies.map((movie) => <option key={movie.movieId || movie.id} value={movie.movieId || movie.id}>{movie.movieName}</option>)}
            </select>
          </div>
          <div className="revenue-field">
            <label htmlFor="revenue-staff">Nhân viên</label>
            <select id="revenue-staff" value={filters.staffId} onChange={(event) => updateFilter('staffId', event.target.value)}>
              <option value="">Tất cả</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.fullName || item.username}</option>)}
            </select>
          </div>
          <div className="revenue-field">
            <label htmlFor="revenue-payment">Thanh toán</label>
            <select id="revenue-payment" value={filters.paymentMethod} onChange={(event) => updateFilter('paymentMethod', event.target.value)}>
              <option value="">Mọi phương thức</option>
              {Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <button type="button" className="revenue-button" onClick={() => setFilters(DEFAULT_FILTERS())}>
            <RotateCcwIcon size={15} aria-hidden="true" />
            Đặt lại
          </button>
        </div>
      </section>

      {error ? (
        <p className="revenue-error" role="alert">{error}</p>
      ) : (
        <>
          <dl className="revenue-summary" aria-label="Tổng hợp doanh thu" aria-busy={loading}>
            {cards.map((card) => (
              <div key={card.label}>
                <dt>{card.label}</dt>
                {loading ? (
                  <dd><SkeletonBox width="75%" height="28px" /></dd>
                ) : (
                  <>
                    <dd className="revenue-stat-value">{card.value}</dd>
                    {card.note && <dd className="revenue-stat-note">{card.note}</dd>}
                  </>
                )}
              </div>
            ))}
          </dl>

          <section className="revenue-panel" aria-labelledby="revenue-breakdown" aria-busy={loading}>
            <header className="revenue-panel-heading">
              <h2 id="revenue-breakdown">Phân tích doanh thu</h2>
              <div className="revenue-groups" role="group" aria-label="Phân nhóm doanh thu">
                {groups.map((item) => (
                  <button key={item.key} type="button" aria-pressed={group === item} onClick={() => setGroup(item)}>
                    {item.label}
                  </button>
                ))}
              </div>
            </header>
            {group.key === 'paymentBreakdown' ? (
              <PaymentTable rows={breakdownRows} total={summary.revenue} loading={loading} />
            ) : (
              <BreakdownTable title={group.label} rows={breakdownRows} total={summary.revenue} loading={loading} />
            )}
          </section>

          <section className="revenue-panel" aria-labelledby="revenue-transactions" aria-busy={loading}>
            <header className="revenue-panel-heading">
              <h2 id="revenue-transactions">Giao dịch</h2>
              {!loading && (
                <p>
                  {summary.bookings > transactionRows.length
                    ? `${formatNumber(transactionRows.length)} / ${formatNumber(summary.bookings)} giao dịch gần nhất`
                    : `${formatNumber(transactionRows.length)} giao dịch`}
                </p>
              )}
            </header>
            <div className="revenue-table-scroll revenue-transactions-scroll" role="region" tabIndex={0} aria-labelledby="revenue-transactions">
              <table className="revenue-table revenue-transactions-table">
                <thead>
                  <tr>
                    <th scope="col">Đơn đặt vé</th>
                    <th scope="col" className="revenue-number">Tổng tiền</th>
                    <th scope="col">Phim / Chi nhánh</th>
                    <th scope="col">Nhân viên</th>
                    <th scope="col">Thanh toán</th>
                    <th scope="col" className="revenue-number">Tiền vé</th>
                    <th scope="col" className="revenue-number">Bắp nước</th>
                  </tr>
                </thead>
                <tbody>
                  {loading || transactionRows.length === 0 ? (
                    <tr><td colSpan={7} className="revenue-table-message">{loading ? 'Đang tải giao dịch…' : 'Không có giao dịch trong kỳ này.'}</td></tr>
                  ) : transactionRows.map((row) => (
                    <tr key={row.bookingId}>
                      <th scope="row">
                        <span className="revenue-code">{row.bookingCode || `#${row.bookingId}`}</span>
                        <span className="revenue-cell-note">{formatDateTime(row.paidAt)}</span>
                      </th>
                      <td className="revenue-number revenue-total">{formatCurrency(row.totalAmount)}</td>
                      <td>
                        {row.movieName || '–'}
                        <span className="revenue-cell-note">{row.branchName || '–'}</span>
                      </td>
                      <td>{row.staffUsername || 'Online'}</td>
                      <td>{paymentLabels[row.paymentMethod] || row.paymentMethod || '–'}</td>
                      <td className="revenue-number">{formatCurrency(row.ticketAmount)}</td>
                      <td className="revenue-number">{formatCurrency(row.foodAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const RevenueShare = ({ amount, total }) => {
  const share = Number(total) > 0 ? Number(amount || 0) / Number(total) : 0;
  return (
    <div className="revenue-share">
      <span aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(share * 100, 100))}%` }} /></span>
      {shareFormatter.format(share)}
    </div>
  );
};

const BreakdownTable = ({ title, rows, total, loading }) => (
  <div className="revenue-table-scroll" role="region" tabIndex={0} aria-label={`Doanh thu theo ${title.toLowerCase()}`}>
    <table className="revenue-table revenue-breakdown-table">
      <thead>
        <tr>
          <th scope="col">{title}</th>
          <th scope="col" className="revenue-number">Số đơn</th>
          <th scope="col" className="revenue-number">Số vé</th>
          <th scope="col" className="revenue-number">Doanh thu</th>
          <th scope="col" className="revenue-number">Tỷ trọng</th>
        </tr>
      </thead>
      <tbody>
        {loading || rows.length === 0 ? (
          <tr><td colSpan={5} className="revenue-table-message">{loading ? 'Đang tải doanh thu…' : 'Không có doanh thu trong kỳ này.'}</td></tr>
        ) : rows.map((row) => (
          <tr key={row.id ?? row.name}>
            <th scope="row">{row.name}</th>
            <td className="revenue-number">{formatNumber(row.bookings)}</td>
            <td className="revenue-number">{formatNumber(row.ticketsSold)}</td>
            <td className="revenue-number revenue-total">{formatCurrency(row.revenue)}</td>
            <td className="revenue-number"><RevenueShare amount={row.revenue} total={total} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PaymentTable = ({ rows, total, loading }) => (
  <div className="revenue-table-scroll" role="region" tabIndex={0} aria-label="Doanh thu theo thanh toán">
    <table className="revenue-table revenue-breakdown-table">
      <thead>
        <tr>
          <th scope="col">Phương thức</th>
          <th scope="col" className="revenue-number">Số đơn</th>
          <th scope="col" className="revenue-number">Doanh thu</th>
          <th scope="col" className="revenue-number">Tỷ trọng</th>
        </tr>
      </thead>
      <tbody>
        {loading || rows.length === 0 ? (
          <tr><td colSpan={4} className="revenue-table-message">{loading ? 'Đang tải doanh thu…' : 'Không có khoản thanh toán trong kỳ này.'}</td></tr>
        ) : rows.map((row) => (
          <tr key={row.paymentMethod}>
            <th scope="row">{paymentLabels[row.paymentMethod] || row.paymentMethod || '–'}</th>
            <td className="revenue-number">{formatNumber(row.bookings)}</td>
            <td className="revenue-number revenue-total">{formatCurrency(row.revenue)}</td>
            <td className="revenue-number"><RevenueShare amount={row.revenue} total={total} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default RevenueReportPage;
