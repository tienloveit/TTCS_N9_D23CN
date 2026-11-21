import { createElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { branchApi, operationsApi, reportsApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import {
  AlertTriangleIcon,
  ArmchairIcon,
  ArrowRightIcon,
  BanknoteIcon,
  DownloadIcon,
  RefreshIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';
import { SkeletonBox } from '../../components/Common/Skeleton';
import './OperationsReportPage.css';
import { formatCinema } from '../../utils/cinemaTime';

const businessDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
const today = () => businessDate.format(new Date());

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const formatDateTime = (value) =>
  formatCinema(value, { hour: '2-digit', minute: '2-digit', hour12: false }, '–');

const percentFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const formatPercent = (value) => percentFormatter.format(Number(value || 0) / 100);
const paymentLabels = { CASH: 'Tiền mặt', CARD: 'Thẻ', VNPAY: 'VNPay' };

const OperationsReportPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [date, setDate] = useState(today);
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState(null);
  const [exporting, setExporting] = useState(false);
  const requestKey = `${date}/${branchId}/${revision}`;
  const currentResponse = response?.key === requestKey ? response : null;
  const loading = !currentResponse;
  const report = currentResponse?.report;
  const error = currentResponse?.error;

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    branchApi.getAll()
      .then((res) => setBranches(res.data.result || []))
      .catch(() => setBranches([]));
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    operationsApi.getDailyReport({ date, branchId: branchId || undefined })
      .then((res) => {
        if (!cancelled) {
          setResponse({ key: requestKey, report: res.data.result });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResponse({
            key: requestKey,
            error: err.response?.data?.message || 'Không thể tải báo cáo vận hành',
          });
        }
      });
    return () => { cancelled = true; };
  }, [date, branchId, requestKey]);

  const summary = report?.summary || {};
  const stats = [
    {
      label: 'Doanh thu',
      value: formatCurrency(summary.revenue),
      note: `${formatNumber(summary.completedBookings)} đơn đã thanh toán`,
      icon: BanknoteIcon,
    },
    {
      label: 'Vé đã bán',
      value: formatNumber(summary.ticketsSold),
      note: `${formatCurrency(summary.ticketRevenue)} doanh thu vé`,
      icon: TicketIcon,
    },
    {
      label: 'Tỷ lệ lấp đầy',
      value: formatPercent(summary.occupancyRate),
      note: `${formatNumber(summary.showtimes)} suất · ${formatNumber(summary.totalCapacity)} ghế`,
      icon: ArmchairIcon,
    },
    {
      label: 'Hoàn tiền chờ duyệt',
      value: formatNumber(summary.refundRequests),
      note: `${formatCurrency(summary.refundedAmount)} đã hoàn trong ngày`,
      icon: AlertTriangleIcon,
      attention: summary.refundRequests > 0,
    },
  ];

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

  const paymentRows = (report?.paymentBreakdown || []).map((item) => ({
    key: item.paymentMethod,
    cells: [
      paymentLabels[item.paymentMethod] || item.paymentMethod || '–',
      formatNumber(item.bookings),
      formatCurrency(item.amount),
    ],
  }));
  const refundRows = (report?.refundQueue || []).map((item) => ({
    key: item.bookingId,
    cells: [
      <span className="ops-booking-code">{item.bookingCode || `#${item.bookingId}`}</span>,
      item.customerName || '–',
      formatCurrency(item.amount),
      item.reason || '–',
    ],
  }));
  const showtimeRows = (report?.showtimeLoads || []).map((item) => {
    const occupancy = Number(item.occupancyRate || 0);
    return {
      key: item.showtimeId,
      cells: [
        <span className="ops-showtime">{formatDateTime(item.startTime)}</span>,
        <div className="ops-screening">
          <strong>{item.movieName || '–'}</strong>
          <span>{item.roomName || '–'}</span>
        </div>,
        `${formatNumber(item.ticketsSold)} / ${formatNumber(item.capacity)}`,
        <div className="ops-occupancy">
          <span className="ops-occupancy-track" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(occupancy, 100))}%` }} />
          </span>
          <strong>{formatPercent(occupancy)}</strong>
        </div>,
      ],
    };
  });

  return (
    <div className="operations-report">
      <header className="ops-heading">
        <h1>Báo cáo vận hành</h1>
        <button
          type="button"
          className="ops-button ops-button--primary"
          onClick={exportExcel}
          disabled={exporting}
        >
          <DownloadIcon size={16} aria-hidden="true" />
          {exporting ? 'Đang xuất…' : 'Xuất Excel'}
        </button>
      </header>

      <div className="ops-filters" role="group" aria-label="Bộ lọc báo cáo">
        <div className="ops-date">
          <label className="ops-field">
            <span>Ngày báo cáo</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value || today())} />
          </label>
          <button type="button" className="ops-button ops-today" onClick={() => setDate(today())}>
            Hôm nay
          </button>
        </div>
        {isAdmin ? (
          <label className="ops-field">
            <span>Chi nhánh</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
              ))}
            </select>
          </label>
        ) : report?.branchName && (
          <div className="ops-field">
            <span>Chi nhánh</span>
            <strong className="ops-branch">{report.branchName}</strong>
          </div>
        )}
        <button
          type="button"
          className="ops-button ops-refresh"
          onClick={() => setRevision((value) => value + 1)}
          disabled={loading}
        >
          <RefreshIcon size={16} aria-hidden="true" />
          Làm mới
        </button>
      </div>

      {error ? (
        <p className="ops-error" role="alert">{error}</p>
      ) : (
        <>
          <dl className="ops-stats" aria-label="Tổng hợp trong ngày" aria-busy={loading}>
            {stats.map((stat) => (
              <div className="ops-stat" key={stat.label} data-attention={stat.attention || undefined}>
                <dt>{createElement(stat.icon, { size: 16, 'aria-hidden': true })}{stat.label}</dt>
                {loading ? (
                  <dd><SkeletonBox width="75%" height="28px" /></dd>
                ) : (
                  <>
                    <dd className="ops-stat-value">{stat.value}</dd>
                    <dd className="ops-stat-note">{stat.note}</dd>
                  </>
                )}
              </div>
            ))}
          </dl>

          <div className="ops-grid">
            <ReportTable
              id="ops-payments"
              title="Đối soát thanh toán"
              headers={['Phương thức', 'Số đơn', 'Doanh thu']}
              numericColumns={[1, 2]}
              rows={paymentRows}
              loading={loading}
              emptyText="Chưa có thanh toán trong ngày."
              footer={paymentRows.length > 0 && [
                'Tổng cộng',
                formatNumber(summary.completedBookings),
                formatCurrency(summary.revenue),
              ]}
            />
            <ReportTable
              id="ops-refunds"
              title="Hoàn tiền chờ duyệt"
              detail={summary.refundRequests > refundRows.length
                ? `Hiển thị ${formatNumber(refundRows.length)} / ${formatNumber(summary.refundRequests)} yêu cầu`
                : undefined}
              headers={['Mã đơn', 'Khách hàng', 'Số tiền', 'Lý do']}
              numericColumns={[2]}
              rows={refundRows}
              loading={loading}
              emptyText="Không có yêu cầu hoàn tiền chờ duyệt."
              action={
                <Link className="ops-link" to={isAdmin ? '/admin/refunds' : '/manager/refunds'}>
                  Quản lý hoàn tiền <ArrowRightIcon size={14} aria-hidden="true" />
                </Link>
              }
            />
          </div>

          <ReportTable
            id="ops-showtimes"
            title="Suất chiếu trong ngày"
            detail={!loading && `${formatNumber(showtimeRows.length)} suất chiếu`}
            headers={['Giờ chiếu', 'Phim / Phòng', 'Vé / Ghế', 'Lấp đầy']}
            numericColumns={[2, 3]}
            rows={showtimeRows}
            loading={loading}
            emptyText="Không có suất chiếu trong ngày."
          />
        </>
      )}
    </div>
  );
};

const ReportTable = ({ id, title, detail, headers, numericColumns, rows, loading, emptyText, action, footer }) => (
  <section className="ops-panel" aria-labelledby={id} aria-busy={loading}>
    <header className="ops-panel-heading">
      <div>
        <h2 id={id}>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {action}
    </header>
    <div className="ops-table-scroll" role="region" tabIndex={0} aria-labelledby={id}>
      <table className="ops-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={header} scope="col" data-numeric={numericColumns.includes(index) || undefined}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td className="ops-table-message" colSpan={headers.length}><SkeletonBox height="36px" /></td></tr>
          ) : rows.length === 0 ? (
            <tr><td className="ops-table-message" colSpan={headers.length}>{emptyText}</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key}>
                {row.cells.map((cell, index) => (
                  <td key={headers[index]} data-numeric={numericColumns.includes(index) || undefined}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && (
          <tfoot>
            <tr>
              <th scope="row">{footer[0]}</th>
              {footer.slice(1).map((cell, index) => (
                <td key={headers[index + 1]} data-numeric="true">{cell}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </section>
);

export default OperationsReportPage;
