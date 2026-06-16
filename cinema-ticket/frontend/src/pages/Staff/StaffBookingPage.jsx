import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../../context/useAuth';
import { bookingApi, foodApi, showtimeApi, ticketApi, promotionApi } from '../../api';
import { API_BASE_URL } from '../../api/axiosClient';
import DigitalTicket from '../../components/Ticket/DigitalTicket';

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
    { key: 'SELECTION', label: '1. Selection' },
    { key: 'SEATS', label: '2. Seats' },
    { key: 'ADDONS', label: '3. Add-ons' },
    { key: 'CHECKOUT', label: '4. Checkout' },
  ];

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

  return (
    <form onSubmit={handleSubmit} className={`counter-booking counter-booking--${currentStep.toLowerCase()}`}>
      <div className="counter-stepper" aria-label="Quy trình đặt vé tại quầy">
        {stepItems.map((step, index) => {
          const activeIndex = stepItems.findIndex((item) => item.key === currentStep);
          const isActive = step.key === currentStep;
          const isDone = index < activeIndex;

          return (
            <div
              key={step.key}
              className={`counter-step ${isActive ? 'counter-step--active' : ''} ${isDone ? 'counter-step--done' : ''}`}
            >
              <span>{isDone || isActive ? '✓' : ''}</span>
              <strong>{step.label}</strong>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {currentStep === 'SELECTION' && (
        <div className="admin-table-card counter-panel counter-showtime-card">
          <div className="table-header" style={{ padding: 0, borderBottom: 0, marginBottom: 18, flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3>Suất chiếu</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                  {filteredShowtimes.length}/{showtimes.length} suất chiếu được lấy từ hệ thống
                </p>
              </div>
            </div>

            {/* Filter row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <label>
                <span className="form-label">Tìm kiếm</span>
                <input
                  type="text"
                  className="input"
                  placeholder="Tên phim, rạp, phòng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>

              <label>
                <span className="form-label">Ngày chiếu</span>
                <input
                  type="date"
                  className="input"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </label>

              <label>
                <span className="form-label">Rạp</span>
                <select className="input" value={branchFilter} onChange={handleBranchFilterChange}>
                  <option value="ALL">Tất cả rạp</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="form-label">Khung giờ</span>
                <select className="input" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                  <option value="ALL">Tất cả</option>
                  <option value="MORNING">Sáng (6h-12h)</option>
                  <option value="AFTERNOON">Chiều (12h-18h)</option>
                  <option value="EVENING">Tối (18h-22h)</option>
                  <option value="NIGHT">Khuya (22h-6h)</option>
                  <option value="UPCOMING">Chưa chiếu</option>
                  <option value="ONGOING">Đang chiếu</option>
                </select>
              </label>

              <label>
                <span className="form-label">Trạng thái</span>
                <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">Tất cả</option>
                  <option value="AVAILABLE">Có thể bán</option>
                  <option value="UNAVAILABLE">Không bán</option>
                </select>
              </label>

              <label>
                <span className="form-label">Loại phòng</span>
                <select className="input" value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)}>
                  <option value="ALL">Tất cả</option>
                  {roomTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={clearFilters}
                    style={{ width: '100%' }}
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>
          </div>

          {filteredShowtimes.length === 0 ? (
            <div className="empty-state">
              {hasActiveFilters
                ? 'Không tìm thấy suất chiếu nào phù hợp với bộ lọc'
                : 'Không có suất chiếu phù hợp với MoviePTIT đã chọn.'}
            </div>
          ) : (
            <div className="counter-showtime-list">
              {showtimeGroups.map((group) => (
                <section key={group.branchName} className="counter-showtime-group">
                  <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>{group.branchName}</h2>
                  <div className="counter-showtime-options">
                    {group.items.map((showtime) => {
                      const available = isShowtimeAvailable(showtime);
                      const selected = String(showtime.showtimeId) === String(showtimeId);

                      return (
                        <button
                          key={showtime.showtimeId}
                          type="button"
                          onClick={() => available && setShowtimeId(String(showtime.showtimeId))}
                          disabled={!available}
                          className={`counter-showtime-option ${selected ? 'counter-showtime-option--active' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{formatTime(showtime.startTime)}</strong>
                            <span className={`status-badge ${available ? 'status--active' : 'status--inactive'}`}>
                              {available ? 'Có thể bán' : 'Không bán'}
                            </span>
                          </div>
                          <div style={{ marginTop: 10, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {showtime.movieName}
                          </div>
                          <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {showtime.roomName} - {showtime.roomType}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="counter-step-actions">
            {selectedShowtime ? (
              <div>
                <span className="form-label">Suất đã chọn</span>
                <strong>{selectedShowtime.movieName}</strong>
                <span>{formatDateTime(selectedShowtime.startTime)}</span>
              </div>
            ) : (
              <div>
                <span className="form-label">Suất đã chọn</span>
                <strong>Chưa chọn suất chiếu</strong>
                <span>Chọn một suất còn bán để qua bước chọn ghế.</span>
              </div>
            )}
            <button
              className="btn btn-primary"
              type="button"
              disabled={!canContinueSelection}
              onClick={continueFromSelection}
            >
              Chọn ghế
            </button>
          </div>
        </div>
      )}

      {selectedShowtime && currentStep !== 'SELECTION' && (
        <>
          <div className="admin-table-card counter-panel counter-selected-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span className="form-label">Suất đang bán</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 20 }}>{selectedShowtime.movieName}</h2>
                <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                  {selectedShowtime.branchName} - {selectedShowtime.roomName}
                </div>
                <div className="counter-selected-seats">
                  {selectedSeatTickets.length > 0
                    ? selectedSeatTickets.map((ticket) => ticket.seatCode).join(', ')
                    : 'Chưa chọn ghế'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="form-label">Thời gian</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
                  {formatDateTime(selectedShowtime.startTime)}
                </div>
              </div>
            </div>
          </div>

          {currentStep === 'SEATS' && (
            <div className="admin-table-card counter-panel counter-seat-card">
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

                  <div className="counter-seat-summary">
                    <span>
                      <strong>{selectedSeats.length}</strong> ghế
                    </span>
                    <strong>{formatCurrency(finalPrice)}</strong>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={!canContinueSeats}
                      onClick={continueFromSeats}
                    >
                      Tiếp tục
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {currentStep === 'ADDONS' && (foods.length > 0 || foodError) && (
            <div className="admin-table-card food-select-card counter-panel counter-food-card">
              <div className="food-select-header">
                <div>
                  <h2>Chọn đồ ăn</h2>
                  <p>Thêm bắp nước và combo vào đơn tại quầy.</p>
                </div>
                <div className="counter-card-actions">
                  {foodTotal > 0 && <strong>{formatCurrency(foodTotal)}</strong>}
                  <button type="button" className="btn btn-primary" onClick={continueToCheckout}>
                    Tiếp tục
                  </button>
                </div>
              </div>

              {foodError && (
                <div className="error-message" style={{ marginBottom: 16 }}>
                  {foodError}
                </div>
              )}

              <div className="food-select-grid">
                {foods.map((food) => {
                  const quantity = selectedFoods[food.id] || 0;
                  const stockLimited = food.stockQuantity != null;
                  const stockLeft = stockLimited ? Number(food.stockQuantity) - quantity : null;
                  const cannotAdd = stockLimited && stockLeft <= 0;

                  return (
                    <div
                      key={food.id}
                      className={`food-option ${quantity > 0 ? 'food-option--selected' : ''}`}
                    >
                      <div className="food-option-media">
                        {food.imageUrl ? (
                          <img src={food.imageUrl} alt={food.name} />
                        ) : (
                          <span>{food.name?.charAt(0) || 'F'}</span>
                        )}
                      </div>

                      <div className="food-option-body">
                        <h3>{food.name}</h3>
                        {food.description && <p>{food.description}</p>}
                        <strong>{formatCurrency(food.price)}</strong>
                        {stockLimited && (
                          <p style={{ color: stockLeft <= 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 700 }}>
                            Còn {Math.max(stockLeft, 0)}
                          </p>
                        )}
                      </div>

                      <div className="food-stepper">
                        <button
                          type="button"
                          onClick={() => updateFoodQuantity(food.id, -1)}
                          disabled={quantity === 0 || submitting}
                          aria-label={`Giảm ${food.name}`}
                        >
                          -
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateFoodQuantity(food.id, 1)}
                          disabled={submitting || cannotAdd}
                          aria-label={`Tăng ${food.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 'CHECKOUT' && (
            <div className="admin-table-card counter-panel counter-checkout-card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                <div>
                  <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Thông tin khách</h2>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <input
                      className="input"
                      placeholder="Họ tên"
                      value={customer.customerName}
                      onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Email để gửi vé"
                      value={customer.customerEmail}
                      onChange={(e) => setCustomer({ ...customer, customerEmail: e.target.value })}
                    />
                    <input
                      className="input"
                      placeholder="Số điện thoại"
                      value={customer.customerPhone}
                      onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Thanh toán tại quầy</h2>
                  <select
                    className="input"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="CARD">Thẻ</option>
                  </select>

                  {/* Mã khuyến mãi — hiện với cả CASH và CARD */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="form-label" style={{ margin: 0 }}>Mã khuyến mãi</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleShowPromos} style={{ fontSize: '0.85rem' }}>
                        {showPromos ? 'Đóng' : 'Xem mã khả dụng'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Nhập mã giảm giá..."
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        style={{ textTransform: 'uppercase', flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleValidatePromo}
                        disabled={validatingPromo || !promoCode.trim()}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {validatingPromo ? '...' : 'Áp dụng'}
                      </button>
                    </div>
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
                                onClick={() => {
                                  setPromoCode(promo.code);
                                  setShowPromos(false);
                                }}>
                                <div>
                                  <strong style={{ color: 'var(--seat-available)' }}>{promo.code}</strong>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {promo.description || `Giảm ${promo.discountPercent}% (tối đa ${formatCurrency(promo.maxDiscount)})`}
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Chọn</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {promoError && (
                      <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 6 }}>{promoError}</div>
                    )}
                    {promoDiscount > 0 && (
                      <div style={{ color: 'var(--seat-available)', fontSize: '0.85rem', marginTop: 6, fontWeight: 600 }}>
                        ✓ Giảm: {formatCurrency(promoDiscount)}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <span className="form-label">Tổng tiền</span>
                    {promoDiscount > 0 && (
                      <div style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through', marginTop: 4 }}>
                        {formatCurrency(total)}
                      </div>
                    )}
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', marginTop: promoDiscount > 0 ? 2 : 6 }}>
                      {formatCurrency(finalPrice)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {lastBooking && (
        <div className="admin-table-card counter-panel counter-success-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: 'var(--green)' }}>
            <span style={{ fontSize: '1.8rem' }}>✓</span>
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
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px dashed var(--border)' }}>
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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrintLastBooking}
            >
              In vé / hóa đơn
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => window.location.reload()}
            >
              Tạo đơn hàng mới
            </button>
          </div>
        </div>
      )}

      {selectedSeats.length > 0 && (
        <div className="booking-bar">
          <span>
            <strong>{selectedSeats.length}</strong> ghế
          </span>
          {foodQuantity > 0 && (
            <span>
              <strong>{foodQuantity}</strong> món
            </span>
          )}
          <span className="booking-bar-total">{formatCurrency(finalPrice)}</span>
          <button
            className="btn btn-primary"
            type={currentStep === 'CHECKOUT' ? 'submit' : 'button'}
            disabled={submitting || (currentStep === 'SEATS' && !canContinueSeats)}
            onClick={(e) => {
              if (currentStep === 'SEATS') {
                e.preventDefault();
                continueFromSeats();
              } else if (currentStep === 'ADDONS') {
                e.preventDefault();
                continueToCheckout();
              }
            }}
          >
            {currentStep === 'SEATS'
              ? 'Tiếp tục'
              : currentStep === 'ADDONS'
                ? 'Tiếp tục thanh toán'
                : submitting ? 'Đang xử lý...' : 'Hoàn tất tại quầy'}
          </button>
        </div>
      )}
    </form>
  );
}
