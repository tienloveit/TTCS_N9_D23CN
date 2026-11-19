import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilmIcon,
  RefreshIcon,
  SearchIcon,
  TicketIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import BookingCard from './BookingCard';
import TicketPassModal from './TicketPassModal';
import RefundDialog from './RefundDialog';
import { ConfirmDialog } from './Dialogs';
import { dismissBookingChange, recordBookingChanges } from './bookingChanges';
import { getBookingPhase, getShowStart, parseLocalDateTime } from './bookingFormat';
import './MyBookingsPage.css';

const FILTERS = [
  { key: 'all', label: 'Tất cả trạng thái' },
  { key: 'upcoming', label: 'Sắp chiếu', phases: ['upcoming'] },
  { key: 'pending', label: 'Chờ thanh toán', phases: ['pending'] },
  { key: 'in_progress', label: 'Đang chiếu', phases: ['in_progress'] },
  { key: 'watched', label: 'Đã chiếu / Đã check-in', phases: ['watched', 'checked_in'] },
  { key: 'closed', label: 'Hủy, hết hạn và hoàn tiền', phases: ['refund_requested', 'refunded', 'cancelled', 'expired'] },
];

const PAGE_SIZE = 6;
const FEATURED_LIMIT = 2;

const createdTime = (b) => parseLocalDateTime(b.createdAt)?.getTime() || 0;
const showTime = (b) => getShowStart(b)?.getTime() || 0;
const byNewest = (a, b) => createdTime(b.booking) - createdTime(a.booking);
const bySoonest = (a, b) => showTime(a.booking) - showTime(b.booking);

const getErrorMessage = (err) => err?.response?.data?.message || err?.message || 'Đã có lỗi xảy ra';

function normalizeSearch(value) {
  return value.toLowerCase().normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/#/g, '')
    .trim();
}

function SkeletonList() {
  return (
    <div className="mt-list" role="status">
      <p className="mt-results">Đang tải danh sách vé…</p>
      {[0, 1].map((i) => <div key={i} className="mt-sk mt-sk-card" aria-hidden="true" />)}
    </div>
  );
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [changeNotices, setChangeNotices] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const resultsHeading = useRef(null);

  const [ticketBooking, setTicketBooking] = useState(null);
  const [refundBooking, setRefundBooking] = useState(null);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchBookings = async () => {
      try {
        const res = await bookingApi.getMyBookings();
        if (!ignore) {
          const list = res.data.result ?? [];
          if (!Array.isArray(list)) throw new Error('Phản hồi danh sách vé không hợp lệ.');
          setBookings(list);
          setChangeNotices(recordBookingChanges(list));
          setNow(Date.now());
          setLoadError('');
        }
      } catch (err) {
        if (!ignore) setLoadError(getErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchBookings();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const hasPending = bookings.some((booking) => booking.status === 'PENDING');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), hasPending ? 1000 : 30000);
    return () => clearInterval(id);
  }, [hasPending]);

  const searchableBookings = useMemo(() => bookings.map((booking) => ({
    booking,
    searchText: normalizeSearch([booking.movieName, booking.bookingCode, booking.branchName, booking.roomName].filter(Boolean).join(' ')),
  })), [bookings]);

  const query = normalizeSearch(search);
  const { upcoming, featured, results } = useMemo(() => {
    const withPhase = searchableBookings.map((item) => ({ ...item, phase: getBookingPhase(item.booking, now) }));
    const upcoming = withPhase.filter((item) => item.phase === 'upcoming').sort(bySoonest);
    const featured = filter === 'all' && !query ? upcoming.slice(0, FEATURED_LIMIT) : [];
    const featuredIds = new Set(featured.map(({ booking }) => booking.bookingId));
    const phases = FILTERS.find((item) => item.key === filter)?.phases;
    const terms = query.split(/\s+/);
    const results = withPhase.filter((item) => (
      !featuredIds.has(item.booking.bookingId) &&
      (!phases || phases.includes(item.phase)) &&
      terms.every((term) => item.searchText.includes(term))
    ));
    const pendingFirst = (a, b) => Number(b.phase === 'pending') - Number(a.phase === 'pending');
    results.sort(filter === 'upcoming' ? bySoonest : (a, b) => pendingFirst(a, b) || byNewest(a, b));
    return { upcoming, featured, results };
  }, [searchableBookings, now, filter, query]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const visibleResults = results.slice(offset, offset + PAGE_SIZE);

  const updateBooking = useCallback((bookingId, patch) => {
    setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? { ...b, ...patch } : b)));
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancelBooking) return;
    setCancelling(true);
    try {
      await bookingApi.cancel(cancelBooking.bookingId);
      updateBooking(cancelBooking.bookingId, { status: 'CANCELLED', paymentStatus: 'CANCELLED' });
      toast.success('Đã hủy đơn đặt vé.');
      setCancelBooking(null);
    } catch (err) {
      toast.error(`Không thể hủy đơn: ${getErrorMessage(err)}`);
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitRefund = async (reason) => {
    if (!refundBooking) return;
    setSubmittingRefund(true);
    try {
      const res = await bookingApi.requestRefund(refundBooking.bookingId, reason);
      const updated = res.data.result;
      updateBooking(
        refundBooking.bookingId,
        updated
          ? { ...updated }
          : { status: 'REFUND_REQUESTED', refundReason: reason, refundAmount: refundBooking.totalAmount }
      );
      toast.success('Đã gửi yêu cầu hoàn tiền.');
      setRefundBooking(null);
    } catch (err) {
      toast.error(`Không thể yêu cầu hoàn tiền: ${getErrorMessage(err)}`);
    } finally {
      setSubmittingRefund(false);
    }
  };

  const closeTicket = useCallback(() => setTicketBooking(null), []);
  const closeRefund = useCallback(() => setRefundBooking(null), []);
  const closeCancel = useCallback(() => setCancelBooking(null), []);

  function reload() {
    if (loading) return;
    setLoadError('');
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  function updateFilter(value) {
    setFilter(value);
    setPage(1);
  }

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function changePage(nextPage) {
    setPage(nextPage);
    resultsHeading.current?.focus();
  }

  function dismissChange(booking) {
    dismissBookingChange(booking);
    setChangeNotices((current) => {
      const next = { ...current };
      delete next[booking.bookingId];
      return next;
    });
  }

  function renderBooking({ booking, phase }) {
    return (
      <BookingCard
        key={booking.bookingId}
        booking={booking}
        phase={phase}
        now={now}
        changeNotice={changeNotices[booking.bookingId]}
        onDismissChange={dismissChange}
        onOpenTicket={setTicketBooking}
        onPay={(selected) => navigate(`/booking/${selected.bookingId}/payment`)}
        onCancel={setCancelBooking}
        onRequestRefund={setRefundBooking}
      />
    );
  }

  return (
    <div className="page mt-page">
      <div className="mt-wrap">
        <header className="mt-header">
          <div>
            <h1 id="mt-page-title" className="mt-heading" tabIndex={-1}>Vé của tôi</h1>
            <p className="mt-subheading">Xem vé QR, kiểm tra suất chiếu và quản lý đơn đặt vé.</p>
          </div>
          <Link to="/movies" className="mt-btn mt-btn--primary"><FilmIcon size={17} />Đặt vé mới</Link>
        </header>

        {bookings.length > 0 && !loadError && (
          <div className="mt-tools" role="group" aria-label="Tìm và lọc đơn đặt vé">
            <div className="mt-field-control">
              <label htmlFor="mt-search">Tìm đơn đặt vé</label>
              <div className="mt-search">
                <SearchIcon size={18} />
                <input id="mt-search" type="text" value={search} placeholder="Tên phim, mã đơn hoặc rạp…" onChange={(event) => updateSearch(event.target.value)} />
                {search && (
                  <button type="button" aria-label="Xóa tìm kiếm" onClick={() => {
                    updateSearch('');
                    document.getElementById('mt-search')?.focus();
                  }}><XIcon size={18} /></button>
                )}
              </div>
            </div>
            <div className="mt-field-control">
              <label htmlFor="mt-filter">Trạng thái</label>
              <select id="mt-filter" value={filter} onChange={(event) => updateFilter(event.target.value)}>
                {FILTERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </div>
            <button type="button" className="mt-btn mt-btn--outline mt-refresh" aria-disabled={loading} onClick={reload}>
              <RefreshIcon size={17} />Cập nhật vé
            </button>
          </div>
        )}

        {loading ? (
          <SkeletonList />
        ) : loadError ? (
          <div className="mt-state">
            <span className="mt-state-icon"><AlertCircleIcon size={25} /></span>
            <div role="alert">
              <h2>Không tải được danh sách vé</h2>
              <p>Hãy thử tải lại để xem các đơn đặt vé của bạn.</p>
            </div>
            <button type="button" className="mt-btn mt-btn--outline" onClick={reload}><RefreshIcon size={17} />Thử lại</button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-state">
            <span className="mt-state-icon"><TicketIcon size={25} /></span>
            <div role="status">
              <h2>Bạn chưa có vé nào</h2>
              <p>Vé và trạng thái đơn sẽ xuất hiện ở đây sau khi bạn đặt vé.</p>
            </div>
            <Link to="/movies?status=NOW_SHOWING" className="mt-btn mt-btn--outline">Xem phim đang chiếu <ArrowRightIcon size={17} /></Link>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="mt-featured" aria-labelledby="mt-featured-title">
                <div className="mt-section-header">
                  <h2 id="mt-featured-title"><CalendarIcon size={20} />Vé sắp sử dụng</h2>
                  {upcoming.length > featured.length && (
                    <button type="button" className="mt-btn mt-btn--outline" onClick={() => {
                      updateFilter('upcoming');
                      document.getElementById('mt-filter')?.focus();
                    }}>
                      Xem cả {upcoming.length} đơn sắp chiếu <ArrowRightIcon size={16} />
                    </button>
                  )}
                </div>
                <div className="mt-featured-list">{featured.map(renderBooking)}</div>
              </section>
            )}

            {(results.length > 0 || featured.length === 0) && (
              <section className="mt-section" aria-labelledby="mt-results-title">
                <div className="mt-section-header">
                  <h2 id="mt-results-title" ref={resultsHeading} tabIndex={-1}>{featured.length ? 'Các đơn đặt vé khác' : 'Đơn đặt vé'}</h2>
                  <span className="mt-results" role="status">
                    {results.length > 0 ? `${offset + 1}–${offset + visibleResults.length} / ${results.length} đơn` : '0 đơn'}
                  </span>
                </div>
                {results.length === 0 ? (
                  <div className="mt-state">
                    <span className="mt-state-icon"><SearchIcon size={25} /></span>
                    <h3>Không tìm thấy đơn phù hợp</h3>
                    <p>Thử từ khóa khác hoặc chọn trạng thái khác.</p>
                    <button type="button" className="mt-btn mt-btn--outline" onClick={() => {
                      updateFilter('all');
                      updateSearch('');
                      document.getElementById('mt-search')?.focus();
                    }}>Xóa bộ lọc</button>
                  </div>
                ) : (
                  <div className="mt-list">{visibleResults.map(renderBooking)}</div>
                )}
                {pageCount > 1 && (
                  <nav className="mt-pagination" aria-label="Phân trang đơn đặt vé">
                    <button type="button" className="mt-btn mt-btn--outline" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}>
                      <ChevronLeftIcon size={18} />Trước
                    </button>
                    <span>Trang {currentPage} / {pageCount}</span>
                    <button type="button" className="mt-btn mt-btn--outline" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount}>
                      Sau<ChevronRightIcon size={18} />
                    </button>
                  </nav>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {ticketBooking && <TicketPassModal booking={ticketBooking} now={now} onClose={closeTicket} />}

      {refundBooking && (
        <RefundDialog
          booking={refundBooking}
          submitting={submittingRefund}
          onSubmit={handleSubmitRefund}
          onClose={closeRefund}
        />
      )}

      {cancelBooking && (
        <ConfirmDialog
          title="Hủy đơn đặt vé?"
          message={`Đơn “${cancelBooking.movieName}” sẽ được hủy và ghế đã giữ sẽ được mở bán lại.`}
          confirmLabel="Hủy đơn"
          cancelLabel="Giữ lại"
          danger
          busy={cancelling}
          onConfirm={handleConfirmCancel}
          onClose={closeCancel}
        />
      )}
    </div>
  );
}
