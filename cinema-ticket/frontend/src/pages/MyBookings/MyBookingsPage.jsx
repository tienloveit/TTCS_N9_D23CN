import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';
import EmptyState from '../../components/Common/EmptyState';
import BookingCard from './BookingCard';
import TicketPassModal from './TicketPassModal';
import RefundDialog from './RefundDialog';
import { ConfirmDialog } from './Dialogs';
import { getBookingPhase, getShowStart, parseLocalDateTime } from './bookingFormat';
import './MyBookingsPage.css';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'upcoming', label: 'Sắp chiếu', phases: ['upcoming'] },
  { key: 'pending', label: 'Chờ thanh toán', phases: ['pending'] },
  { key: 'watched', label: 'Đã chiếu', phases: ['watched'] },
  {
    key: 'closed',
    label: 'Huỷ & hoàn tiền',
    phases: ['refund_requested', 'refunded', 'cancelled', 'expired', 'other'],
  },
];

const EMPTY_COPY = {
  upcoming: 'Bạn chưa có suất chiếu nào sắp tới.',
  pending: 'Không có đơn nào đang chờ thanh toán.',
  watched: 'Bạn chưa xem suất chiếu nào cùng MoviePTIT.',
  closed: 'Không có đơn huỷ hoặc hoàn tiền.',
};

const createdTime = (b) => parseLocalDateTime(b.createdAt)?.getTime() || 0;
const showTime = (b) => getShowStart(b)?.getTime() || 0;
const byNewest = (a, b) => createdTime(b) - createdTime(a);
const bySoonest = (a, b) => showTime(a) - showTime(b);

const getErrorMessage = (err) => err?.response?.data?.message || err?.message || 'Đã có lỗi xảy ra';

function SkeletonList() {
  return (
    <div className="mt-list" aria-busy="true" aria-label="Đang tải vé">
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-card mt-card--skeleton">
          <div className="mt-poster-col"><div className="mt-sk mt-sk-poster" /></div>
          <div className="mt-body">
            <div className="mt-sk mt-sk-line" style={{ width: 96 }} />
            <div className="mt-sk mt-sk-title" />
            <div className="mt-sk mt-sk-line" style={{ width: '70%' }} />
            <div className="mt-sk mt-sk-line" style={{ width: '45%' }} />
          </div>
          <div className="mt-stub">
            <div className="mt-sk mt-sk-line" style={{ width: '60%' }} />
            <div className="mt-sk mt-sk-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [now, setNow] = useState(() => Date.now());

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
          setBookings(res.data.result || []);
          setLoadError('');
        }
      } catch (err) {
        console.error('Lỗi khi tải vé', err);
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

  const hasPending = bookings.some((b) => b.status === 'PENDING');

  // Đồng hồ cho đếm ngược giữ ghế / thời hạn hoàn tiền.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), hasPending ? 1000 : 30000);
    return () => clearInterval(id);
  }, [hasPending]);

  const withPhase = useMemo(
    () => bookings.map((booking) => ({ booking, phase: getBookingPhase(booking, now) })),
    [bookings, now]
  );

  const counts = useMemo(() => {
    const result = { all: withPhase.length };
    TABS.forEach((tab) => {
      if (tab.phases) result[tab.key] = withPhase.filter((x) => tab.phases.includes(x.phase)).length;
    });
    return result;
  }, [withPhase]);

  const sections = useMemo(() => {
    const pick = (phases) => withPhase.filter((x) => phases.includes(x.phase)).map((x) => x.booking);

    if (activeTab === 'all') {
      const pending = pick(['pending']).sort(byNewest);
      const upcoming = pick(['upcoming']).sort(bySoonest);
      const history = withPhase
        .filter((x) => x.phase !== 'pending' && x.phase !== 'upcoming')
        .map((x) => x.booking)
        .sort(byNewest);
      return [
        { key: 'pending', title: 'Cần thanh toán', items: pending },
        { key: 'upcoming', title: 'Suất chiếu sắp tới', items: upcoming },
        { key: 'history', title: 'Lịch sử đặt vé', items: history },
      ].filter((s) => s.items.length > 0);
    }

    const tab = TABS.find((t) => t.key === activeTab);
    const items = pick(tab.phases).sort(activeTab === 'upcoming' ? bySoonest : byNewest);
    return items.length ? [{ key: activeTab, title: null, items }] : [];
  }, [withPhase, activeTab]);

  const updateBooking = useCallback((bookingId, patch) => {
    setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? { ...b, ...patch } : b)));
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancelBooking) return;
    setCancelling(true);
    try {
      await bookingApi.cancel(cancelBooking.bookingId);
      updateBooking(cancelBooking.bookingId, { status: 'CANCELLED', paymentStatus: 'CANCELLED' });
      toast.success('Đã huỷ đơn đặt vé.');
      setCancelBooking(null);
    } catch (err) {
      toast.error(`Không thể huỷ đơn: ${getErrorMessage(err)}`);
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

  const subtitle = loading
    ? 'Đang tải danh sách vé...'
    : counts.upcoming > 0
      ? `Bạn có ${counts.upcoming} suất chiếu sắp tới${counts.pending ? ` và ${counts.pending} đơn chờ thanh toán` : ''}.`
      : counts.pending > 0
        ? `Bạn có ${counts.pending} đơn đang chờ thanh toán.`
        : 'Lịch sử đặt vé và trạng thái thanh toán của bạn.';

  return (
    <div className="page mt-page">
      <div className="mt-wrap">
        <header className="mt-header">
          <div>
            <h1 className="mt-heading">Vé của tôi</h1>
            <p className="mt-subheading">{subtitle}</p>
          </div>
          <Link to="/movies" className="mt-btn mt-btn--outline mt-header-cta">
            Đặt vé mới
          </Link>
        </header>

        <nav className="mt-tabs" role="tablist" aria-label="Lọc đơn đặt vé">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`mt-tab ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {!loading && counts[tab.key] > 0 && <span className="mt-tab-count">{counts[tab.key]}</span>}
            </button>
          ))}
        </nav>

        {loading ? (
          <SkeletonList />
        ) : loadError ? (
          <div className="mt-error">
            <p>Không tải được danh sách vé. {loadError}</p>
            <button
              type="button"
              className="mt-btn mt-btn--outline"
              onClick={() => {
                setLoading(true);
                setReloadKey((k) => k + 1);
              }}
            >
              Thử lại
            </button>
          </div>
        ) : sections.length === 0 ? (
          activeTab === 'all' ? (
            <EmptyState
              title="Bạn chưa có vé nào"
              message="Có vẻ như bạn chưa đặt vé nào tại MoviePTIT. Chọn một bộ phim và trải nghiệm ngay nhé!"
              buttonText="Tìm phim đặt vé ngay"
            />
          ) : (
            <div className="mt-empty">
              <p>{EMPTY_COPY[activeTab]}</p>
              <button type="button" className="mt-link-btn" onClick={() => setActiveTab('all')}>
                Xem tất cả đơn
              </button>
            </div>
          )
        ) : (
          sections.map((section) => (
            <section key={section.key} className="mt-section">
              {section.title && (
                <h2 className="mt-section-title">
                  {section.title}
                  <span className="mt-section-count">{section.items.length}</span>
                </h2>
              )}
              <div className="mt-list">
                {section.items.map((booking) => (
                  <BookingCard
                    key={booking.bookingId}
                    booking={booking}
                    now={now}
                    onOpenTicket={setTicketBooking}
                    onPay={(b) => navigate(`/booking/${b.bookingId}/payment`)}
                    onCancel={setCancelBooking}
                    onRequestRefund={setRefundBooking}
                  />
                ))}
              </div>
            </section>
          ))
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
          title="Huỷ đơn đặt vé?"
          message={`Ghế ${cancelBooking.seatCodes?.join(', ') || ''} của suất “${cancelBooking.movieName}” sẽ được mở lại cho người khác.`}
          confirmLabel="Huỷ đơn"
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
