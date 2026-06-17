import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../../context/useAuth';
import { bookingApi, foodApi, showtimeApi, ticketApi, promotionApi } from '../../api';
import { API_BASE_URL } from '../../api/axiosClient';
import DigitalTicket from '../../components/Ticket/DigitalTicket';
import { ClockIcon } from '../../components/Common/CinemaIcons';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '';

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    : '';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${weekdays[d.getDay()]}, ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildPrintDocument = (booking) => {
  const seatCodes = booking.seatCodes || (booking.tickets || []).map((ticket) => ticket.seatCode);
  const foods = booking.foods || [];
  const foodRows = foods.length
    ? foods
      .map(
        (food) => `
            <tr>
              <td>${escapeHtml(food.foodName)}</td>
              <td>${escapeHtml(food.quantity)}</td>
              <td>${formatCurrency(food.subtotal)}</td>
            </tr>
          `
      )
      .join('')
    : '<tr><td colspan="3">Không có đồ ăn kèm</td></tr>';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(booking.bookingCode || 'Hoa don')}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
          .ticket { width: 80mm; padding: 14px; }
          .brand { text-align: center; border-bottom: 1px dashed #9ca3af; padding-bottom: 10px; margin-bottom: 10px; }
          .brand h1 { font-size: 18px; margin: 0 0 4px; }
          .brand p, .muted { color: #6b7280; font-size: 12px; margin: 0; }
          .row { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; font-size: 13px; }
          .row strong { text-align: right; }
          .section { border-top: 1px dashed #9ca3af; margin-top: 10px; padding-top: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          td, th { padding: 5px 0; border-bottom: 1px solid #e5e7eb; text-align: left; }
          td:last-child, th:last-child { text-align: right; }
          .total { font-size: 18px; font-weight: 800; text-align: right; margin-top: 10px; }
          .code { font-family: monospace; font-size: 13px; text-align: center; margin-top: 12px; }
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="brand">
            <h1>MoviePTIT</h1>
            <p>Vé xem phim / Hóa đơn tại quầy</p>
          </div>

          <div class="row"><span>Mã đơn</span><strong>${escapeHtml(booking.bookingCode)}</strong></div>
          <div class="row"><span>Phim</span><strong>${escapeHtml(booking.movieName)}</strong></div>
          <div class="row"><span>Suất chiếu</span><strong>${formatDateTime(booking.showtimeStart)}</strong></div>
          <div class="row"><span>Phòng</span><strong>${escapeHtml(booking.roomName || '')}</strong></div>
          <div class="row"><span>Ghế</span><strong>${escapeHtml(seatCodes.join(', '))}</strong></div>
          <div class="row"><span>Thanh toán</span><strong>${escapeHtml(booking.paymentMethod || 'CASH')}</strong></div>

          <div class="section">
            <table>
              <thead>
                <tr><th>Món</th><th>SL</th><th>Tiền</th></tr>
              </thead>
              <tbody>${foodRows}</tbody>
            </table>
          </div>

          ${booking.discountAmount > 0 ? `<div class="row section"><span>Giảm giá</span><strong>${formatCurrency(booking.discountAmount)}</strong></div>` : ''}
          <div class="total">${formatCurrency(booking.totalAmount)}</div>
          <div class="code">${escapeHtml(booking.bookingCode)}</div>
          <p class="muted" style="text-align:center;margin-top:10px">Vui lòng giữ vé để check-in.</p>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 300);
          };
        </script>
      </body>
    </html>
  `;
};

export default function StaffBookingPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showtimes, setShowtimes] = useState([]);
  const [foods, setFoods] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showtimeId, setShowtimeId] = useState('');
  const [currentStep, setCurrentStep] = useState('SELECTION');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState({});
  const [customer, setCustomer] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [showPromos, setShowPromos] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);
  const [error, setError] = useState('');
  const [foodError, setFoodError] = useState('');
  const stompClient = useRef(null);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([showtimeApi.getAll(), foodApi.getAll()])
      .then(([showtimeResult, foodResult]) => {
        if (!mounted) return;

        if (showtimeResult.status === 'fulfilled') {
          setShowtimes(showtimeResult.value.data.result || []);
        } else {
          setError('Không tải được danh sách suất chiếu');
        }

        if (foodResult.status === 'fulfilled') {
          setFoods((foodResult.value.data.result || []).filter((food) => food.active !== false));
        } else {
          setFoodError('Không tải được menu đồ ăn');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setTickets([]);
    setSelectedSeats([]);
    setSelectedFoods({});
    setLastBooking(null);
    setError('');
    setCurrentStep('SELECTION');

    if (stompClient.current) {
      stompClient.current.deactivate();
      stompClient.current = null;
    }

    if (!showtimeId) return undefined;

    let mounted = true;
    setLoadingTickets(true);

    ticketApi
      .getByShowtimeId(showtimeId)
      .then((res) => {
        if (mounted) setTickets(res.data.result || []);
      })
      .catch(() => {
        if (mounted) setError('Không tải được sơ đồ ghế');
      })
      .finally(() => {
        if (mounted) setLoadingTickets(false);
      });

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/showtime/${showtimeId}/seats`, (message) => {
          const event = JSON.parse(message.body);

          setTickets((prev) =>
            prev.map((ticket) =>
              ticket.seatId === event.seatId
                ? { ...ticket, displayStatus: event.status }
                : ticket
            )
          );

          if (event.status !== 'AVAILABLE') {
            setSelectedSeats((prev) => prev.filter((id) => id !== event.seatId));
          }
        });
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      mounted = false;
      client.deactivate();
    };
  }, [showtimeId]);

  const selectedShowtime = showtimes.find(
    (item) => String(item.showtimeId) === String(showtimeId)
  );

  const branchOptions = useMemo(() => {
    const branchMap = new Map();

    const allowedShowtimes = (!isAdmin && user?.branchId)
      ? showtimes.filter(s => String(s.branchId) === String(user.branchId))
      : showtimes;

    allowedShowtimes.forEach((showtime) => {
      const key = showtime.branchId == null ? showtime.branchName || 'UNKNOWN' : String(showtime.branchId);
      if (!branchMap.has(key)) {
        branchMap.set(key, {
          id: key,
          name: showtime.branchName || 'MoviePTIT chưa xác định',
        });
      }
    });

    return [...branchMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [showtimes, isAdmin, user]);

  const roomTypeOptions = useMemo(() => {
    const types = new Set();
    showtimes.forEach((showtime) => {
      if (showtime.roomType) {
        types.add(showtime.roomType.toUpperCase());
      }
    });
    return [...types].sort();
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => {
    let result = showtimes;

    // Chỉ cho phép STAFF/MANAGER xem suất chiếu của chi nhánh mình
    if (!isAdmin && user?.branchId) {
      result = result.filter(showtime => String(showtime.branchId) === String(user.branchId));
    }

    // Filter by branch
    if (branchFilter !== 'ALL') {
      result = result.filter((showtime) => {
        const key = showtime.branchId == null ? showtime.branchName || 'UNKNOWN' : String(showtime.branchId);
        return key === branchFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((showtime) => {
        const movieName = (showtime.movieName || '').toLowerCase();
        const branchName = (showtime.branchName || '').toLowerCase();
        const roomName = (showtime.roomName || '').toLowerCase();
        return movieName.includes(query) || branchName.includes(query) || roomName.includes(query);
      });
    }

    // Filter by date
    if (dateFilter) {
      result = result.filter((showtime) => {
        if (!showtime.startTime) return false;
        const showtimeDate = new Date(showtime.startTime).toISOString().split('T')[0];
        return showtimeDate === dateFilter;
      });
    }

    // Filter by time
    if (timeFilter !== 'ALL') {
      const now = new Date();
      result = result.filter((showtime) => {
        if (!showtime.startTime) return false;
        const startTime = new Date(showtime.startTime);
        const hour = startTime.getHours();

        switch (timeFilter) {
          case 'MORNING': // 6h - 12h
            return hour >= 6 && hour < 12;
          case 'AFTERNOON': // 12h - 18h
            return hour >= 12 && hour < 18;
          case 'EVENING': // 18h - 22h
            return hour >= 18 && hour < 22;
          case 'NIGHT': // 22h - 6h
            return hour >= 22 || hour < 6;
          case 'UPCOMING': // Chưa chiếu (sau thời điểm hiện tại)
            return startTime > now;
          case 'ONGOING': {
            const endTime = showtime.endTime ? new Date(showtime.endTime) : null;
            return startTime <= now && (!endTime || endTime > now);
          }
          default:
            return true;
        }
      });
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter((showtime) => {
        const available = isShowtimeAvailable(showtime);
        if (statusFilter === 'AVAILABLE') return available;
        if (statusFilter === 'UNAVAILABLE') return !available;
        return true;
      });
    }

    // Filter by room type
    if (roomTypeFilter !== 'ALL') {
      result = result.filter((showtime) => {
        const roomType = (showtime.roomType || '').toUpperCase();
        return roomType.includes(roomTypeFilter);
      });
    }

    return result;
  }, [branchFilter, showtimes, searchQuery, dateFilter, timeFilter, statusFilter, roomTypeFilter, isAdmin, user]);

  const showtimeGroups = useMemo(() => {
    const grouped = filteredShowtimes.reduce((acc, showtime) => {
      const branch = showtime.branchName || 'Rạp chưa xác định';
      if (!acc[branch]) acc[branch] = [];
      acc[branch].push(showtime);
      return acc;
    }, {});

    return Object.entries(grouped).map(([branchName, items]) => ({
      branchName,
      items: [...items].sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0)),
    }));
  }, [filteredShowtimes]);

  const handleBranchFilterChange = (event) => {
    const nextBranchFilter = event.target.value;
    setBranchFilter(nextBranchFilter);

    if (showtimeId && nextBranchFilter !== 'ALL') {
      const selected = showtimes.find((showtime) => String(showtime.showtimeId) === String(showtimeId));
      const selectedBranchKey =
        selected?.branchId == null ? selected?.branchName || 'UNKNOWN' : String(selected.branchId);

      if (selectedBranchKey !== nextBranchFilter) {
        setShowtimeId('');
      }
    }
  };

  const sortedRows = useMemo(() => {
    const rows = tickets.reduce((acc, ticket) => {
      const row = ticket.seatCode?.charAt(0) || ticket.rowLabel || '?';
      if (!acc[row]) acc[row] = [];
      acc[row].push(ticket);
      return acc;
    }, {});

    return Object.entries(rows)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([row, seats]) => [
        row,
        [...seats].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0)),
      ]);
  }, [tickets]);

  const selectedSeatTickets = useMemo(
    () => tickets.filter((ticket) => selectedSeats.includes(ticket.seatId)),
    [tickets, selectedSeats]
  );

  // Group selected seats by seat type (matching user page pattern)
  const seatGroups = useMemo(() => {
    const groups = {};
    selectedSeatTickets.forEach((t) => {
      const type = t.seatType || 'Ghế thường';
      if (!groups[type]) groups[type] = { seats: [], price: Number(t.price || 0) };
      groups[type].seats.push(t.seatCode || `${t.rowLabel || '?'}${t.seatNumber || ''}`);
    });
    return Object.entries(groups);
  }, [selectedSeatTickets]);

  const selectedFoodItems = useMemo(
    () =>
      foods
        .map((food) => ({ ...food, quantity: selectedFoods[food.id] || 0 }))
        .filter((food) => food.quantity > 0),
    [foods, selectedFoods]
  );

  const seatTotal = useMemo(
    () =>
      tickets
        .filter((ticket) => selectedSeats.includes(ticket.seatId))
        .reduce((sum, ticket) => sum + Number(ticket.price || 0), 0),
    [tickets, selectedSeats]
  );

  const foodTotal = useMemo(
    () =>
      selectedFoodItems.reduce(
        (sum, food) => sum + Number(food.price || 0) * food.quantity,
        0
      ),
    [selectedFoodItems]
  );

  const foodQuantity = selectedFoodItems.reduce((sum, food) => sum + food.quantity, 0);
  const total = seatTotal + foodTotal;
  const finalPrice = Math.max(0, total - promoDiscount);
  const hasActiveFilters =
    searchQuery ||
    dateFilter ||
    branchFilter !== 'ALL' ||
    timeFilter !== 'ALL' ||
    statusFilter !== 'AVAILABLE' ||
    roomTypeFilter !== 'ALL';
  const canContinueSelection = Boolean(showtimeId);
  const canContinueSeats = selectedSeats.length > 0;
  const stepItems = [
    { key: 'SELECTION', label: 'Chọn phim / Rạp / Suất' },
    { key: 'SEATS', label: 'Chọn ghế' },
    { key: 'ADDONS', label: 'Chọn thức ăn' },
    { key: 'CHECKOUT', label: 'Thanh toán' },
    { key: 'CONFIRM', label: 'Xác nhận' },
  ];

  // Compute sibling showtimes (same movie, same branch, same date)
  const siblingShowtimes = useMemo(() => {
    if (!selectedShowtime) return [];
    const stDate = selectedShowtime.startTime?.split('T')[0];
    return showtimes
      .filter(s =>
        s.movieId === selectedShowtime.movieId &&
        s.branchId === selectedShowtime.branchId &&
        s.startTime?.split('T')[0] === stDate &&
        isShowtimeAvailable(s)
      )
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [selectedShowtime, showtimes]);

  // Reset giảm giá khi giỏ hàng thay đổi
  useEffect(() => {
    if (promoDiscount > 0) {
      setPromoDiscount(0);
      setPromoError('Giỏ hàng thay đổi, vui lòng áp dụng lại mã');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  function isShowtimeAvailable(showtime) {
    const now = new Date();
    const startTime = showtime.startTime ? new Date(showtime.startTime) : null;

    // Suất chiếu có thể bán nếu:
    // 1. Có startTime và chưa chiếu (hoặc vừa mới bắt đầu trong vòng 15 phút)
    // 2. Status là OPEN (nếu có)
    if (!startTime) return false;

    // Cho phép bán vé cho đến khi phim bắt đầu chiếu + 15 phút
    const cutoffTime = new Date(startTime.getTime() + 15 * 60 * 1000);
    const notExpired = now < cutoffTime;

    // Nếu có status, kiểm tra status === 'OPEN', nếu không có status thì coi như OK
    const statusOk = !showtime.status || showtime.status === 'OPEN';

    return notExpired && statusOk;
  }

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) { setPromoDiscount(0); setPromoError(''); return; }
    if (total === 0) { setPromoError('Vui lòng chọn ghế trước khi áp dụng mã'); return; }
    setValidatingPromo(true);
    setPromoError('');
    try {
      const res = await promotionApi.validate({ code: promoCode, orderAmount: total });
      setPromoDiscount(Number(res.data.result.discountAmount));
    } catch (err) {
      setPromoDiscount(0);
      setPromoError(err.response?.data?.message || 'Mã không hợp lệ');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleShowPromos = async () => {
    setShowPromos(!showPromos);
    if (availablePromos.length === 0 && !showPromos) {
      setLoadingPromos(true);
      try {
        const res = await promotionApi.getAvailable();
        setAvailablePromos(res.data.result || []);
      } catch (err) {
        console.error('Failed to fetch promotions', err);
      } finally {
        setLoadingPromos(false);
      }
    }
  };

  const toggleSeat = (ticket) => {
    const status = ticket.displayStatus || ticket.ticketStatus;
    if (status !== 'AVAILABLE') return;

    setSelectedSeats((prev) =>
      prev.includes(ticket.seatId)
        ? prev.filter((seatId) => seatId !== ticket.seatId)
        : [...prev, ticket.seatId]
    );
  };

  const getSeatClass = (ticket) => {
    const status = ticket.displayStatus || ticket.ticketStatus;
    if (selectedSeats.includes(ticket.seatId)) return 'seat seat--selected';
    if (status === 'BOOKED') return 'seat seat--booked';
    if (status === 'HOLDING') return 'seat seat--holding';
    return 'seat seat--available';
  };

  const updateFoodQuantity = (foodId, delta) => {
    setSelectedFoods((prev) => {
      const quantity = Math.max(0, (prev[foodId] || 0) + delta);
      const next = { ...prev };
      if (quantity === 0) delete next[foodId];
      else next[foodId] = quantity;
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('');
    setBranchFilter('ALL');
    setTimeFilter('ALL');
    setStatusFilter('AVAILABLE');
    setRoomTypeFilter('ALL');
  };

  const continueFromSelection = () => {
    if (!showtimeId) {
      toast.error('Chọn suất chiếu');
      return;
    }
    setCurrentStep('SEATS');
  };

  const continueFromSeats = () => {
    if (!showtimeId) {
      toast.error('Chọn suất chiếu');
      setCurrentStep('SELECTION');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Chọn ít nhất 1 ghế');
      return;
    }
    setCurrentStep(foods.length > 0 || foodError ? 'ADDONS' : 'CHECKOUT');
  };

  const continueToCheckout = () => {
    setCurrentStep('CHECKOUT');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!showtimeId) {
      toast.error('Chọn suất chiếu');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Chọn ít nhất 1 ghế');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await bookingApi.staffCreate({
        showtimeId: Number(showtimeId),
        seatIds: selectedSeats,
        foods: selectedFoodItems.map((food) => ({ foodId: food.id, quantity: food.quantity })),
        paymentMethod,
        promotionCode: promoDiscount > 0 ? promoCode : undefined,
        ...customer,
      });
      const booking = res.data.result;
      if (paymentMethod === 'CARD') {
        toast.info('Đang chuyển hướng đến cổng thanh toán VNPay...');
        navigate(`/booking/${booking.bookingId}/payment`);
        return;
      }
      setLastBooking(booking);
      setSelectedSeats([]);
      setSelectedFoods({});
      setCustomer({ customerName: '', customerEmail: '', customerPhone: '' });
      setPromoCode('');
      setPromoDiscount(0);
      setPromoError('');

      const ticketRes = await ticketApi.getByShowtimeId(showtimeId);
      setTickets(ticketRes.data.result || []);
      toast.success('Đặt vé tại quầy thành công');
    } catch (err) {
      const message = err.response?.data?.message || 'Đặt vé thất bại';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintLastBooking = () => {
    if (!lastBooking) return;
    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) {
      toast.error('Trình duyệt đang chặn cửa sổ in');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(lastBooking));
    printWindow.document.close();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const activeIndex = stepItems.findIndex((item) => item.key === currentStep);

  // Build steps matching user page pattern
  const steps = stepItems.map((step, index) => ({
    label: step.label,
    key: step.key,
    active: step.key === currentStep,
    done: index < activeIndex,
  }));

  return (
    <form onSubmit={handleSubmit} className="page">
      <div className="container">
        {/* Booking Steps (matching user page stepper) */}
        {!lastBooking && (
          <div className="booking-steps">
            {steps.map((step, i) => (
              <div
                key={step.key}
                className={`booking-step ${step.active ? 'booking-step--active' : ''} ${step.done ? 'booking-step--done' : ''}`}
              >
                <div className="booking-step-dot">{step.done ? '✓' : i + 1}</div>
                <span className="booking-step-label">{step.label}</span>
                {i < steps.length - 1 && <div className="booking-step-line" />}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="error-message" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        {lastBooking ? (
          /* SUCCESS PAGE */
          <div className="card checkin-result-card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 24, color: 'var(--green)' }}>
              <span style={{ fontSize: '2.5rem' }}>✓</span>
              <h2 style={{ margin: 0 }}>ĐẶT VÉ THÀNH CÔNG!</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
              <DigitalTicket booking={{
                ...lastBooking,
                startTime: lastBooking.showtimeStart,
                seatCodes: lastBooking.seatCodes || (lastBooking.tickets || []).map(t => t.seatCode),
                status: 'COMPLETED'
              }} />
            </div>
            {lastBooking.foods && lastBooking.foods.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px dashed var(--border)', textAlign: 'left' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem' }}>🍿 Đồ ăn cần giao cho khách:</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {lastBooking.foods.map((bf) => (
                    <div key={bf.id} style={{ background: 'var(--bg-card)', padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.95rem' }}>
                      <strong style={{ color: 'var(--accent)' }}>{bf.quantity}x</strong> {bf.foodName}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={handlePrintLastBooking}>
                In vé / hóa đơn
              </button>
              <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                Tạo đơn hàng mới
              </button>
            </div>
          </div>
        ) : (
          <div className="seat-page-layout">
            {/* ===== LEFT: Main Content ===== */}
            <div className="seat-page-main">

              {currentStep === 'SELECTION' && (
                <div className="card" style={{ padding: 24 }}>
                  <div className="showtime-switcher" style={{ marginBottom: 20 }}>
                    <div className="showtime-switcher-label">Lọc suất chiếu</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, padding: 12 }}>
                      <input type="text" className="input" placeholder="Tìm tên phim, rạp..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                      <input type="date" className="input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                      <select className="input" value={branchFilter} onChange={handleBranchFilterChange}>
                        <option value="ALL">Tất cả rạp</option>
                        {branchOptions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <select className="input" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                        <option value="ALL">Khung giờ: Tất cả</option>
                        <option value="MORNING">Sáng (6h-12h)</option>
                        <option value="AFTERNOON">Chiều (12h-18h)</option>
                        <option value="EVENING">Tối (18h-22h)</option>
                        <option value="NIGHT">Khuya (22h-6h)</option>
                      </select>
                      <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="AVAILABLE">Chỉ suất có thể bán</option>
                        <option value="ALL">Tất cả trạng thái</option>
                      </select>
                      {hasActiveFilters && (
                        <button type="button" className="btn" onClick={clearFilters}>Xóa lọc</button>
                      )}
                    </div>
                  </div>

                  {filteredShowtimes.length === 0 ? (
                    <div className="empty-state">Không có suất chiếu phù hợp.</div>
                  ) : (
                    <div className="cinema-schedule-list">
                      {showtimeGroups.map((group) => (
                        <div key={group.branchName} className="cinema-schedule-branch">
                          <h3 className="cinema-schedule-branch-name">{group.branchName}</h3>
                          <div className="cinema-schedule-times" style={{ flexWrap: 'wrap' }}>
                            {group.items.map((showtime) => {
                              const available = isShowtimeAvailable(showtime);
                              const selected = String(showtime.showtimeId) === String(showtimeId);
                              return (
                                <button
                                  key={showtime.showtimeId}
                                  type="button"
                                  className={`cinema-showtime-btn ${selected ? 'showtime-switcher-btn--active' : ''}`}
                                  onClick={() => available && setShowtimeId(String(showtime.showtimeId))}
                                  disabled={!available}
                                  style={{
                                    opacity: available ? 1 : 0.5,
                                    cursor: available ? 'pointer' : 'not-allowed',
                                    ...(selected ? {
                                      background: 'var(--blue)',
                                      color: '#fff',
                                      borderColor: 'var(--blue)',
                                      boxShadow: '0 2px 8px rgba(7, 86, 166, 0.25)'
                                    } : {})
                                  }}
                                  title={`${showtime.movieName} - ${showtime.roomName}`}
                                >
                                  <span>{formatTime(showtime.startTime)}</span>
                                  <small className="showtime-seats-info" style={selected ? { color: 'rgba(255,255,255,0.8)' } : {}}>
                                    {showtime.movieName}
                                  </small>
                                  <small className="showtime-seats-info" style={selected ? { color: 'rgba(255,255,255,0.6)' } : {}}>
                                    {showtime.roomName} - {showtime.roomType}
                                  </small>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'SEATS' && (
                <>
                {/* Showtime Switcher (matching user page) */}
                {siblingShowtimes.length > 1 && (
                  <div className="showtime-switcher">
                    <div className="showtime-switcher-label">
                      <ClockIcon className="inline-icon" />
                      Đổi suất chiếu
                    </div>
                    <div className="showtime-switcher-list">
                      {siblingShowtimes.map((st) => (
                        <button
                          key={st.showtimeId}
                          type="button"
                          className={`showtime-switcher-btn ${String(st.showtimeId) === String(showtimeId) ? 'showtime-switcher-btn--active' : ''}`}
                          onClick={() => {
                            if (String(st.showtimeId) !== String(showtimeId)) {
                              setSelectedSeats([]);
                              setSelectedFoods({});
                              setShowtimeId(String(st.showtimeId));
                              setCurrentStep('SEATS');
                            }
                          }}
                        >
                          {formatTime(st.startTime)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card" style={{ padding: 32 }}>
                  {loadingTickets ? (
                    <div className="loading"><div className="spinner" /></div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
                        <div className="seat-screen" />
                      </div>
                      <div className="seat-map-wrapper">
                        <div className="seat-map">
                          {sortedRows.map(([row, seats]) => (
                            <div key={row} className="seat-row">
                              <span className="seat-row-label">{row}</span>
                              {seats.map((ticket) => (
                                <div
                                  key={ticket.id}
                                  className={getSeatClass(ticket)}
                                  onClick={() => toggleSeat(ticket)}
                                  title={`${ticket.seatCode} - ${ticket.displayStatus || ticket.ticketStatus}`}
                                >
                                  {ticket.seatNumber || ''}
                                </div>
                              ))}
                              <span className="seat-row-label">{row}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="seat-legend">
                        <div className="seat-legend-item">
                          <div className="seat-legend-dot" style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'var(--seat-available)' }} />
                          Trống
                        </div>
                        <div className="seat-legend-item">
                          <div className="seat-legend-dot" style={{ background: 'rgba(59,130,246,0.3)', borderColor: 'var(--seat-selected)' }} />
                          Đang chọn
                        </div>
                        <div className="seat-legend-item">
                          <div className="seat-legend-dot" style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'var(--seat-holding)' }} />
                          Đang giữ
                        </div>
                        <div className="seat-legend-item">
                          <div className="seat-legend-dot" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'var(--seat-booked)' }} />
                          Đã đặt
                        </div>
                      </div>
                    </>
                  )}
                </div>
                </>
              )}

              {currentStep === 'ADDONS' && (foods.length > 0 || foodError) && (
                <div className="card food-select-card">
                  <div className="food-select-header">
                    <div>
                      <h2>Chọn đồ ăn</h2>
                      <p>Bắp nước và combo có thể thêm vào cùng đơn đặt vé.</p>
                    </div>
                    {foodTotal > 0 && <strong>{formatCurrency(foodTotal)}</strong>}
                  </div>
                  {foodError && <div className="error-message" style={{ marginBottom: 16 }}>{foodError}</div>}
                  <div className="food-select-grid">
                    {foods.map((food) => {
                      const quantity = selectedFoods[food.id] || 0;
                      const stockLimited = food.stockQuantity != null;
                      const stockLeft = stockLimited ? Number(food.stockQuantity) - quantity : null;
                      const cannotAdd = stockLimited && stockLeft <= 0;

                      return (
                        <div key={food.id} className={`food-option ${quantity > 0 ? 'food-option--selected' : ''}`}>
                          <div className="food-option-media">
                            {food.imageUrl ? <img src={food.imageUrl} alt={food.name} /> : <span>{food.name?.charAt(0) || 'F'}</span>}
                          </div>
                          <div className="food-option-body">
                            <h3>{food.name}</h3>
                            {food.description && <p>{food.description}</p>}
                            <strong>{formatCurrency(food.price)}</strong>
                            {stockLimited && (
                              <p style={{ color: stockLeft <= 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 700 }}>Còn {Math.max(stockLeft, 0)}</p>
                            )}
                          </div>
                          <div className="food-stepper">
                            <button type="button" onClick={() => updateFoodQuantity(food.id, -1)} disabled={quantity === 0 || submitting}>-</button>
                            <span>{quantity}</span>
                            <button type="button" onClick={() => updateFoodQuantity(food.id, 1)} disabled={submitting || cannotAdd}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 'CHECKOUT' && (
                <div className="card" style={{ padding: 32 }}>
                  <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                    <h3 style={{ marginBottom: 16 }}>Thông tin khách hàng (Không bắt buộc)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <input className="input" placeholder="Họ và tên" value={customer.customerName} onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })} />
                      <input className="input" placeholder="Email nhận vé" value={customer.customerEmail} onChange={(e) => setCustomer({ ...customer, customerEmail: e.target.value })} />
                      <input className="input" placeholder="Số điện thoại" value={customer.customerPhone} onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                    <h3 style={{ marginBottom: 12 }}>Phương thức thanh toán</h3>
                    <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="CASH">Thanh toán Tiền mặt</option>
                      <option value="CARD">Thanh toán Online (VNPay)</option>
                    </select>
                  </div>

                  {/* Mã khuyến mãi - matching PaymentPage style */}
                  <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0 }}>Mã khuyến mãi</h3>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleShowPromos} style={{ fontSize: '0.85rem' }}>
                        {showPromos ? 'Đóng' : 'Xem mã khả dụng'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Nhập mã giảm giá..."
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        style={{ textTransform: 'uppercase', flex: 1 }}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleValidatePromo())}
                      />
                      <button type="button" className="btn btn-secondary" onClick={handleValidatePromo} disabled={validatingPromo || !promoCode.trim()}>
                        {validatingPromo ? '...' : 'Áp dụng'}
                      </button>
                    </div>
                    {promoError && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 6 }}>{promoError}</div>}

                    {showPromos && (
                      <div style={{ marginTop: 12, background: 'var(--bg-secondary)', padding: 12, borderRadius: 'var(--radius-md)', maxHeight: 200, overflowY: 'auto' }}>
                        {loadingPromos ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Đang tải...</div>
                        ) : availablePromos.length === 0 ? (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Không có mã khả dụng</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {availablePromos.map(promo => (
                              <div key={promo.id}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)' }}
                                onClick={() => { setPromoCode(promo.code); setShowPromos(false); }}>
                                <div>
                                  <strong style={{ color: 'var(--seat-available)' }}>{promo.code}</strong>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {promo.description || `Giảm ${promo.discountPercent}%`}
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Chọn</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tổng tiền - matching PaymentPage style */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: promoDiscount > 0 ? 8 : 0 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tạm tính:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, color: 'var(--seat-available)', fontWeight: 600 }}>
                        <span>Giảm giá:</span>
                        <span>-{formatCurrency(promoDiscount)}</span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      paddingTop: 12, borderTop: '1px dashed var(--border)'
                    }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tổng tiền:</span>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)' }}>
                        {formatCurrency(finalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ===== RIGHT: Sidebar (matching user page pattern) ===== */}
            <aside className="seat-sidebar">
              <div className="seat-sidebar-card">
                {/* Poster + Movie Info */}
                <div className="seat-sidebar-header">
                  {selectedShowtime?.thumbnailUrl && (
                    <img
                      src={selectedShowtime.thumbnailUrl}
                      alt={selectedShowtime.movieName}
                      className="seat-sidebar-poster"
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="seat-sidebar-info">
                    <h3 className="seat-sidebar-title">
                      {selectedShowtime ? selectedShowtime.movieName : 'Chưa chọn suất'}
                    </h3>
                    {selectedShowtime && (
                      <div className="seat-sidebar-subtitle">
                        <span>2D Phụ Đề</span>
                        <span> - </span>
                        <span className="seat-sidebar-age-badge">{selectedShowtime.ageRating || 'P'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cinema + Showtime info (matching user page) */}
                <div className="seat-sidebar-cinema">
                  <div className="seat-sidebar-cinema-name">
                    {selectedShowtime
                      ? `${selectedShowtime.branchName}${selectedShowtime.roomName ? ` - ${selectedShowtime.roomName} (${selectedShowtime.roomType})` : ''}`
                      : '-'}
                  </div>
                  {selectedShowtime?.startTime && (
                    <div className="seat-sidebar-cinema-time">
                      Suất <strong>{formatTime(selectedShowtime.startTime)}</strong> - {formatDate(selectedShowtime.startTime)}
                    </div>
                  )}
                </div>

                {/* Ticket Items (matching user page seat groups) */}
                {seatGroups.length > 0 && (
                  <div className="seat-sidebar-items">
                    {seatGroups.map(([type, data]) => (
                      <div key={type} className="seat-sidebar-item">
                        <div className="seat-sidebar-item-info">
                          <span className="seat-sidebar-item-qty">{data.seats.length}x</span>
                          <div>
                            <div className="seat-sidebar-item-name">{type}</div>
                            <div className="seat-sidebar-item-detail">Ghế: {data.seats.join(', ')}</div>
                          </div>
                        </div>
                        <span className="seat-sidebar-item-price">{formatCurrency(data.price * data.seats.length)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Food Items (matching user page) */}
                {selectedFoodItems.length > 0 && (
                  <div className="seat-sidebar-items">
                    {selectedFoodItems.map((food) => (
                      <div key={food.id} className="seat-sidebar-item">
                        <div className="seat-sidebar-item-info">
                          <span className="seat-sidebar-item-qty">{food.quantity}x</span>
                          <div>
                            <div className="seat-sidebar-item-name">{food.name}</div>
                          </div>
                        </div>
                        <span className="seat-sidebar-item-price">{formatCurrency(food.price * food.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Promo discount */}
                {promoDiscount > 0 && (
                  <div className="seat-sidebar-items" style={{ color: 'var(--seat-available)' }}>
                    <div className="seat-sidebar-item">
                      <div className="seat-sidebar-item-info">
                        <div>
                          <div className="seat-sidebar-item-name" style={{ color: 'var(--seat-available)' }}>Mã giảm giá</div>
                        </div>
                      </div>
                      <span className="seat-sidebar-item-price" style={{ color: 'var(--seat-available)' }}>- {formatCurrency(promoDiscount)}</span>
                    </div>
                  </div>
                )}

                {/* Total (matching user page) */}
                <div className="seat-sidebar-total">
                  <span>Tổng cộng</span>
                  <strong>{formatCurrency(finalPrice)}</strong>
                </div>

                {/* Actions (matching user page button style) */}
                <div className="seat-sidebar-actions">
                  {currentStep === 'SELECTION' && (
                    <button
                      type="button"
                      className="btn btn-primary seat-sidebar-btn"
                      style={{ width: '100%' }}
                      disabled={!canContinueSelection}
                      onClick={continueFromSelection}
                    >
                      Tiếp tục chọn ghế
                    </button>
                  )}
                  {currentStep === 'SEATS' && (
                    <>
                      <button type="button" className="btn btn-secondary seat-sidebar-btn" onClick={() => setCurrentStep('SELECTION')}>Quay lại</button>
                      <button type="button" className="btn btn-primary seat-sidebar-btn" disabled={!canContinueSeats} onClick={continueFromSeats}>
                        Tiếp tục
                      </button>
                    </>
                  )}
                  {currentStep === 'ADDONS' && (
                    <>
                      <button type="button" className="btn btn-secondary seat-sidebar-btn" onClick={() => setCurrentStep('SEATS')}>Quay lại</button>
                      <button type="button" className="btn btn-primary seat-sidebar-btn" onClick={continueToCheckout}>
                        Thanh toán
                      </button>
                    </>
                  )}
                  {currentStep === 'CHECKOUT' && (
                    <>
                      <button type="button" className="btn btn-secondary seat-sidebar-btn" onClick={() => setCurrentStep(foods.length > 0 ? 'ADDONS' : 'SEATS')}>Quay lại</button>
                      <button type="submit" className="btn btn-primary seat-sidebar-btn" disabled={submitting}>
                        {submitting ? 'Đang xử lý...' : 'Xác nhận đơn'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Mobile booking bar (matching user page) */}
      {!lastBooking && selectedSeats.length > 0 && (
        <div className="booking-bar seat-page-mobile-bar">
          <span>
            <strong>{selectedSeats.length}</strong> ghế
          </span>
          {foodQuantity > 0 && (
            <span>
              <strong>{foodQuantity}</strong> món
            </span>
          )}
          <span className="booking-bar-total">{formatCurrency(finalPrice)}</span>
          {currentStep === 'CHECKOUT' ? (
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (currentStep === 'SELECTION') continueFromSelection();
                else if (currentStep === 'SEATS') continueFromSeats();
                else if (currentStep === 'ADDONS') continueToCheckout();
              }}
            >
              Tiếp tục
            </button>
          )}
        </div>
      )}
    </form>
  );
}
