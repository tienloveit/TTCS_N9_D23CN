import { formatScreening } from '../../utils/cinemaFormats';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../../context/useAuth';
import { bookingApi, foodApi, movieApi, showtimeApi, ticketApi, promotionApi } from '../../api';
import { API_BASE_URL } from '../../api/axiosClient';
import DigitalTicket from '../../components/Ticket/DigitalTicket';
import SafeImage from '../../components/Common/SafeImage';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanknoteIcon,
  CalculatorIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  GiftIcon,
  PopcornIcon,
  PrinterIcon,
  SearchIcon,
  TicketIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
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
  return `${weekdays[d.getDay()]}, ${d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`;
};

const toLocalDateKey = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

          ${booking.discountAmount > 0 ? `<div class="row section"><span>Giảm giá</span><strong>-${formatCurrency(booking.discountAmount)}</strong></div>` : ''}
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

const TIME_FILTERS = [
  { key: 'ALL', label: 'Tất cả khung giờ' },
  { key: 'UPCOMING', label: 'Sắp chiếu' },
  { key: 'MORNING', label: 'Sáng (6h - 12h)' },
  { key: 'AFTERNOON', label: 'Chiều (12h - 18h)' },
  { key: 'EVENING', label: 'Tối (18h - 22h)' },
  { key: 'NIGHT', label: 'Khuya (22h+)' },
];

export default function StaffBookingPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [showtimes, setShowtimes] = useState([]);
  const [moviesMap, setMoviesMap] = useState({});
  const [foods, setFoods] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showtimeId, setShowtimeId] = useState('');
  const [currentStep, setCurrentStep] = useState('SELECTION');

  // Filters
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');

  // Cart & Checkout
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState({});
  const [customer, setCustomer] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashReceived, setCashReceived] = useState('');

  // Promotions
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [showPromos, setShowPromos] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(false);

  // Status
  const [loading, setLoading] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);
  const [error, setError] = useState('');
  const [foodError, setFoodError] = useState('');
  const stompClient = useRef(null);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([showtimeApi.getAll(), foodApi.getAll(), movieApi.getAll({ size: 200 })])
      .then(([showtimeResult, foodResult, movieResult]) => {
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

        if (movieResult.status === 'fulfilled') {
          const rawMovies = movieResult.value.data.result;
          const list = Array.isArray(rawMovies) ? rawMovies : rawMovies?.content || [];
          const map = {};
          list.forEach((m) => {
            const id = m.movieId ?? m.id;
            if (id != null) map[String(id)] = m;
          });
          setMoviesMap(map);
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
    setCashReceived('');

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

  function isShowtimeAvailable(showtime) {
    const now = new Date();
    const startTime = showtime.startTime ? new Date(showtime.startTime) : null;
    if (!startTime) return false;
    const cutoffTime = new Date(startTime.getTime() + 15 * 60 * 1000);
    const notExpired = now < cutoffTime;
    const statusOk = !showtime.status || showtime.status === 'OPEN';
    return notExpired && statusOk;
  }

  const selectedShowtime = useMemo(
    () => showtimes.find((item) => String(item.showtimeId) === String(showtimeId)),
    [showtimes, showtimeId]
  );

  const selectedMovieMeta = useMemo(() => {
    if (!selectedShowtime) return null;
    return moviesMap[String(selectedShowtime.movieId)] || null;
  }, [selectedShowtime, moviesMap]);

  // Quick date strip (Today + next 6 days)
  const quickDates = useMemo(() => {
    const days = [];
    const weekdaysShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const base = new Date();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = toLocalDateKey(d);
      const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : weekdaysShort[d.getDay()];
      const display = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      days.push({ key, label, display });
    }
    return days;
  }, []);

  const branchOptions = useMemo(() => {
    const branchMap = new Map();
    const allowedShowtimes =
      !isAdmin && user?.branchId
        ? showtimes.filter((s) => String(s.branchId) === String(user.branchId))
        : showtimes;

    allowedShowtimes.forEach((showtime) => {
      const key =
        showtime.branchId == null ? showtime.branchName || 'UNKNOWN' : String(showtime.branchId);
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
      if (showtime.roomTechnology) {
        types.add(formatScreening(showtime.screeningFormat, showtime.roomTechnology).toUpperCase());
      }
    });
    return [...types].sort();
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => {
    let result = showtimes;

    if (!isAdmin && user?.branchId) {
      result = result.filter((showtime) => String(showtime.branchId) === String(user.branchId));
    }

    if (branchFilter !== 'ALL') {
      result = result.filter((showtime) => {
        const key =
          showtime.branchId == null ? showtime.branchName || 'UNKNOWN' : String(showtime.branchId);
        return key === branchFilter;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((showtime) => {
        const movieName = (showtime.movieName || '').toLowerCase();
        const branchName = (showtime.branchName || '').toLowerCase();
        const roomName = (showtime.roomName || '').toLowerCase();
        return (
          movieName.includes(query) || branchName.includes(query) || roomName.includes(query)
        );
      });
    }

    if (dateFilter) {
      result = result.filter((showtime) => {
        if (!showtime.startTime) return false;
        return toLocalDateKey(showtime.startTime) === dateFilter;
      });
    }

    if (timeFilter !== 'ALL') {
      const now = new Date();
      result = result.filter((showtime) => {
        if (!showtime.startTime) return false;
        const startTime = new Date(showtime.startTime);
        const hour = startTime.getHours();

        switch (timeFilter) {
          case 'MORNING':
            return hour >= 6 && hour < 12;
          case 'AFTERNOON':
            return hour >= 12 && hour < 18;
          case 'EVENING':
            return hour >= 18 && hour < 22;
          case 'NIGHT':
            return hour >= 22 || hour < 6;
          case 'UPCOMING':
            return startTime > now;
          default:
            return true;
        }
      });
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((showtime) => {
        const available = isShowtimeAvailable(showtime);
        if (statusFilter === 'AVAILABLE') return available;
        if (statusFilter === 'UNAVAILABLE') return !available;
        return true;
      });
    }

    if (roomTypeFilter !== 'ALL') {
      result = result.filter((showtime) => {
        const roomTechnology = formatScreening(showtime.screeningFormat, showtime.roomTechnology).toUpperCase();
        return roomTechnology.includes(roomTypeFilter);
      });
    }

    return result;
  }, [
    branchFilter,
    showtimes,
    searchQuery,
    dateFilter,
    timeFilter,
    statusFilter,
    roomTypeFilter,
    isAdmin,
    user,
  ]);

  // Group filtered showtimes by Movie -> then by Branch for fast POS visual scanning
  const movieGroups = useMemo(() => {
    const map = new Map();

    filteredShowtimes.forEach((st) => {
      const mKey = st.movieId != null ? String(st.movieId) : st.movieName || 'UNKNOWN';
      if (!map.has(mKey)) {
        const meta = moviesMap[String(st.movieId)] || {};
        map.set(mKey, {
          movieKey: mKey,
          movieId: st.movieId,
          movieName: st.movieName || meta.movieName || 'Phim chưa rõ tên',
          thumbnailUrl: st.thumbnailUrl || meta.thumbnailUrl || meta.posterUrl || '',
          ageRating: st.ageRating || meta.ageRating || 'P',
          duration: meta.duration || meta.durationMinutes || null,
          language: meta.language || '2D Phụ Đề',
          branches: new Map(),
        });
      }

      const group = map.get(mKey);
      const bName = st.branchName || 'Rạp chưa xác định';
      if (!group.branches.has(bName)) {
        group.branches.set(bName, []);
      }
      group.branches.get(bName).push(st);
    });

    return [...map.values()].map((m) => ({
      ...m,
      branches: [...m.branches.entries()].map(([branchName, items]) => ({
        branchName,
        items: [...items].sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0)),
      })),
    }));
  }, [filteredShowtimes, moviesMap]);

  const handleBranchFilterChange = (event) => {
    const nextBranchFilter = event.target.value;
    setBranchFilter(nextBranchFilter);

    if (showtimeId && nextBranchFilter !== 'ALL') {
      const selected = showtimes.find(
        (showtime) => String(showtime.showtimeId) === String(showtimeId)
      );
      const selectedBranchKey =
        selected?.branchId == null
          ? selected?.branchName || 'UNKNOWN'
          : String(selected.branchId);

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

  const seatMapStats = useMemo(() => {
    let available = 0;
    let holding = 0;
    let booked = 0;
    tickets.forEach((t) => {
      const st = t.displayStatus || t.ticketStatus;
      if (st === 'BOOKED') booked += 1;
      else if (st === 'HOLDING') holding += 1;
      else available += 1;
    });
    return { total: tickets.length, available, holding, booked };
  }, [tickets]);

  const selectedSeatTickets = useMemo(
    () => tickets.filter((ticket) => selectedSeats.includes(ticket.seatId)),
    [tickets, selectedSeats]
  );

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

  // Quick cash presets based on finalPrice
  const cashPresets = useMemo(() => {
    if (finalPrice <= 0) return [];
    const base = new Set([finalPrice]);
    const roundTargets = [50000, 100000, 200000, 500000];
    roundTargets.forEach((step) => {
      const rounded = Math.ceil(finalPrice / step) * step;
      if (rounded >= finalPrice) base.add(rounded);
    });
    [100000, 200000, 500000, 1000000].forEach((bill) => {
      if (bill >= finalPrice) base.add(bill);
    });
    return [...base].sort((a, b) => a - b).slice(0, 5);
  }, [finalPrice]);

  const numericCashReceived = Number(cashReceived || 0);
  const cashChange = numericCashReceived - finalPrice;

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
    { key: 'SELECTION', label: 'Suất chiếu', badge: selectedShowtime ? '1' : null },
    { key: 'SEATS', label: 'Chọn ghế', badge: selectedSeats.length > 0 ? String(selectedSeats.length) : null },
    { key: 'ADDONS', label: 'Bắp nước', badge: foodQuantity > 0 ? String(foodQuantity) : null },
    { key: 'CHECKOUT', label: 'Thu tiền & Xuất vé', badge: null },
  ];

  const siblingShowtimes = useMemo(() => {
    if (!selectedShowtime) return [];
    const stDate = toLocalDateKey(selectedShowtime.startTime);
    return showtimes
      .filter(
        (s) =>
          s.movieId === selectedShowtime.movieId &&
          s.branchId === selectedShowtime.branchId &&
          toLocalDateKey(s.startTime) === stDate &&
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

  const handleSelectShowtime = (st, jumpToSeats = false) => {
    if (!isShowtimeAvailable(st)) return;
    const nextId = String(st.showtimeId);
    setShowtimeId(nextId);
    if (jumpToSeats) {
      setCurrentStep('SEATS');
    }
  };

  const handleStepNavigation = (targetStep) => {
    if (targetStep === 'SELECTION') {
      setCurrentStep('SELECTION');
      return;
    }
    if (!showtimeId) {
      toast.info('Vui lòng chọn suất chiếu trước');
      return;
    }
    if (targetStep === 'SEATS') {
      setCurrentStep('SEATS');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.info('Vui lòng chọn ít nhất 1 ghế');
      setCurrentStep('SEATS');
      return;
    }
    setCurrentStep(targetStep);
  };

  const handleResetOrder = () => {
    setSelectedSeats([]);
    setSelectedFoods({});
    setPromoCode('');
    setPromoDiscount(0);
    setPromoError('');
    setCashReceived('');
    setCustomer({ customerName: '', customerEmail: '', customerPhone: '' });
    setCurrentStep('SELECTION');
    setShowtimeId('');
  };

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setPromoDiscount(0);
      setPromoError('');
      return;
    }
    if (total === 0) {
      setPromoError('Vui lòng chọn ghế trước khi áp dụng mã');
      return;
    }
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
    const type = String(ticket.seatType || '').toUpperCase();
    const tierClass =
      type === 'VIP'
        ? 'seat--tier-vip'
        : type === 'COUPLE'
        ? 'seat--tier-couple'
        : '';
    if (selectedSeats.includes(ticket.seatId)) return `seat seat--selected ${tierClass}`.trim();
    if (status === 'BOOKED') return 'seat seat--booked';
    if (status === 'HOLDING') return 'seat seat--holding';
    return `seat seat--available ${tierClass}`.trim();
  };

  const updateFoodQuantity = (foodId, delta) => {
    const stock = foods.find((food) => food.id === foodId)?.stockQuantity;
    setSelectedFoods((prev) => {
      const maxQuantity = stock == null ? Infinity : Math.max(0, stock);
      const quantity = Math.min(maxQuantity, Math.max(0, (prev[foodId] || 0) + delta));
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
      setCashReceived('');

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
  const posterUrl =
    selectedShowtime?.thumbnailUrl ||
    selectedMovieMeta?.thumbnailUrl ||
    selectedMovieMeta?.posterUrl ||
    '';

  return (
    <form onSubmit={handleSubmit} className="pos-page">
      {/* ===== TOP POS CONTROL BAR ===== */}
      {!lastBooking && (
        <div className="pos-top-bar">
          <div className="pos-top-bar-left">
            <span className="pos-badge-live">
              <span className="pos-badge-live-dot" />
              POS Quầy vé
            </span>
            <div className="pos-top-title">
              <h1>Bán vé trực tiếp tại quầy</h1>
              <p>
                {selectedShowtime
                  ? `${selectedShowtime.movieName} • ${formatTime(selectedShowtime.startTime)} (${selectedShowtime.roomName || 'Phòng chiếu'})`
                  : 'Chọn suất chiếu để mở sơ đồ ghế thời gian thực'}
              </p>
            </div>
          </div>

          <div className="pos-stepper">
            {stepItems.map((step, index) => {
              const isActive = step.key === currentStep;
              const isDone =
                (step.key === 'SELECTION' && Boolean(showtimeId) && currentStep !== 'SELECTION') ||
                (step.key === 'SEATS' && selectedSeats.length > 0 && activeIndex > 1) ||
                (step.key === 'ADDONS' && activeIndex > 2);
              const disabled =
                (step.key === 'SEATS' && !showtimeId) ||
                ((step.key === 'ADDONS' || step.key === 'CHECKOUT') &&
                  (!showtimeId || selectedSeats.length === 0));

              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleStepNavigation(step.key)}
                  className={`pos-step-pill ${isActive ? 'pos-step-pill--active' : ''} ${
                    isDone ? 'pos-step-pill--done' : ''
                  }`}
                >
                  <span className="pos-step-pill-num">
                    {isDone ? <CheckIcon size={13} strokeWidth={3} /> : index + 1}
                  </span>
                  <span>{step.label}</span>
                  {step.badge && <span className="pos-step-badge">{step.badge}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {lastBooking ? (
        /* ===== SUCCESS RECEIPT PAGE ===== */
        <div
          className="card checkin-result-card"
          style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: 36 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 18px',
              borderRadius: 999,
              background: 'rgba(22, 163, 74, 0.12)',
              color: 'var(--green)',
              fontWeight: 800,
              marginBottom: 20,
            }}
          >
            <CheckIcon size={18} strokeWidth={3} />
            <span>XUẤT VÉ TẠI QUẦY THÀNH CÔNG</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <DigitalTicket
              booking={{
                ...lastBooking,
                startTime: lastBooking.showtimeStart,
                seatCodes:
                  lastBooking.seatCodes || (lastBooking.tickets || []).map((t) => t.seatCode),
                status: 'COMPLETED',
              }}
            />
          </div>

          {lastBooking.foods && lastBooking.foods.length > 0 && (
            <div
              style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: '2px dashed var(--border)',
                textAlign: 'left',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PopcornIcon size={18} />
                <span>Đồ ăn cần chuẩn bị giao khách:</span>
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {lastBooking.foods.map((bf) => (
                  <div
                    key={bf.id}
                    style={{
                      background: '#f8fafc',
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    <strong style={{ color: 'var(--accent)', marginRight: 6 }}>
                      {bf.quantity}x
                    </strong>
                    {bf.foodName}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 28,
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={handlePrintLastBooking}>
              <PrinterIcon size={18} />
              <span>In vé / Hóa đơn nhiệt (80mm)</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setLastBooking(null);
                handleResetOrder();
              }}
            >
              + Tạo đơn bán vé mới
            </button>
          </div>
        </div>
      ) : (
        /* ===== 2-COLUMN POS WORKSPACE ===== */
        <div className="pos-workspace">
          {/* LEFT WORKSPACE */}
          <div className="pos-main">
            {/* STEP 1: SHOWTIME SELECTION */}
            {currentStep === 'SELECTION' && (
              <>
                <div className="pos-filter-card">
                  {/* Quick Date Strip */}
                  <div className="pos-date-ribbon">
                    <button
                      type="button"
                      className={`pos-date-chip ${dateFilter === '' ? 'pos-date-chip--active' : ''}`}
                      onClick={() => setDateFilter('')}
                    >
                      <span>Tất cả</span>
                      <strong>Mọi ngày</strong>
                    </button>
                    {quickDates.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        className={`pos-date-chip ${
                          dateFilter === d.key ? 'pos-date-chip--active' : ''
                        }`}
                        onClick={() => setDateFilter(d.key === dateFilter ? '' : d.key)}
                      >
                        <span>{d.label}</span>
                        <strong>{d.display}</strong>
                      </button>
                    ))}
                  </div>

                  {/* Search & Dropdown Filters */}
                  <div className="pos-filter-row">
                    <div className="pos-search-box">
                      <SearchIcon />
                      <input
                        type="text"
                        className="input"
                        placeholder="Tìm nhanh tên phim, phòng chiếu, rạp..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <input
                      type="date"
                      className="pos-filter-select"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      title="Chọn ngày cụ thể"
                    />

                    <select
                      className="pos-filter-select"
                      value={branchFilter}
                      onChange={handleBranchFilterChange}
                    >
                      <option value="ALL">Tất cả chi nhánh</option>
                      {branchOptions.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="pos-filter-select"
                      value={roomTypeFilter}
                      onChange={(e) => setRoomTypeFilter(e.target.value)}
                    >
                      <option value="ALL">Mọi định dạng phòng</option>
                      {roomTypeOptions.map((rt) => (
                        <option key={rt} value={rt}>
                          Phòng {rt}
                        </option>
                      ))}
                    </select>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ height: 42, padding: '0 14px', fontSize: '0.82rem' }}
                        onClick={clearFilters}
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>

                  {/* Time of day pills + Status toggle */}
                  <div className="pos-time-pills">
                    <div className="pos-time-pill-group">
                      {TIME_FILTERS.map((tf) => (
                        <button
                          key={tf.key}
                          type="button"
                          className={`pos-time-pill ${
                            timeFilter === tf.key ? 'pos-time-pill--active' : ''
                          }`}
                          onClick={() => setTimeFilter(tf.key)}
                        >
                          {tf.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter === 'AVAILABLE'}
                          onChange={(e) =>
                            setStatusFilter(e.target.checked ? 'AVAILABLE' : 'ALL')
                          }
                        />
                        Chỉ hiện suất còn mở bán
                      </label>
                      <span className="pos-result-Summary">
                        ({filteredShowtimes.length} suất chiếu)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Movie Grouped Showtime Cards */}
                {movieGroups.length === 0 ? (
                  <div
                    className="card"
                    style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>
                      Không tìm thấy suất chiếu phù hợp với bộ lọc hiện tại.
                    </p>
                    {hasActiveFilters && (
                      <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                        Xóa toàn bộ bộ lọc
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pos-movie-list">
                    {movieGroups.map((movie) => {
                      const hasSelectedInMovie = movie.branches.some((b) =>
                        b.items.some((s) => String(s.showtimeId) === String(showtimeId))
                      );

                      return (
                        <div
                          key={movie.movieKey}
                          className={`pos-movie-card ${
                            hasSelectedInMovie ? 'pos-movie-card--selected' : ''
                          }`}
                        >
                          <SafeImage
                            src={movie.thumbnailUrl}
                            alt={movie.movieName}
                            className="pos-movie-poster"
                          />

                          <div className="pos-movie-body">
                            <div className="pos-movie-header">
                              <div>
                                <h2 className="pos-movie-title">{movie.movieName}</h2>
                                <div className="pos-movie-badges">
                                  <span className="pos-meta-tag pos-meta-tag--age">
                                    {movie.ageRating}
                                  </span>
                                  <span className="pos-meta-tag pos-meta-tag--format">
                                    {movie.language}
                                  </span>
                                  {movie.duration && (
                                    <span className="pos-meta-tag">
                                      <ClockIcon size={12} /> {movie.duration} phút
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#64748b',
                                  fontWeight: 600,
                                }}
                              >
                                Nhấp chọn giờ chiếu (Nhấp đúp để vào chọn ghế ngay)
                              </span>
                            </div>

                            {movie.branches.map((branch) => (
                              <div key={branch.branchName} className="pos-branch-group">
                                <div className="pos-branch-label">{branch.branchName}</div>
                                <div className="pos-slot-grid">
                                  {branch.items.map((st) => {
                                    const available = isShowtimeAvailable(st);
                                    const selected = String(st.showtimeId) === String(showtimeId);
                                    const availSeats = st.availableSeats;
                                    const totalSeats = st.totalSeats;
                                    const hasSeatCount =
                                      availSeats != null && totalSeats != null && totalSeats > 0;
                                    const isLow = hasSeatCount && availSeats > 0 && availSeats <= 15;
                                    const isFull = hasSeatCount && availSeats === 0;

                                    return (
                                      <button
                                        key={st.showtimeId}
                                        type="button"
                                        disabled={!available || isFull}
                                        onClick={() => handleSelectShowtime(st, false)}
                                        onDoubleClick={() => handleSelectShowtime(st, true)}
                                        className={`pos-slot-btn ${
                                          selected ? 'pos-slot-btn--selected' : ''
                                        }`}
                                        title="Nhấp để chọn suất, nhấp đúp để chuyển thẳng sang sơ đồ ghế"
                                      >
                                        <div className="pos-slot-top">
                                          <span className="pos-slot-time">
                                            {formatTime(st.startTime)}
                                          </span>
                                          {st.roomTechnology && (
                                            <span className="pos-slot-type">{formatScreening(st.screeningFormat, st.roomTechnology)}</span>
                                          )}
                                        </div>
                                        <div className="pos-slot-room">
                                          {st.roomName || 'Phòng chiếu'}
                                          {!dateFilter && st.startTime
                                            ? ` • ${new Date(st.startTime).toLocaleDateString(
                                                'vi-VN',
                                                { day: '2-digit', month: '2-digit' }
                                              )}`
                                            : ''}
                                        </div>
                                        {hasSeatCount ? (
                                          <div
                                            className={`pos-slot-seats ${
                                              isFull
                                                ? 'pos-slot-seats--full'
                                                : isLow
                                                ? 'pos-slot-seats--low'
                                                : ''
                                            }`}
                                          >
                                            {isFull
                                              ? 'Hết ghế'
                                              : `Còn ${availSeats}/${totalSeats} ghế`}
                                          </div>
                                        ) : (
                                          <div className="pos-slot-seats">
                                            {available ? 'Đang mở bán' : 'Đã đóng'}
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* STEP 2: SEAT MAP SELECTION */}
            {currentStep === 'SEATS' && (
              <>
                {siblingShowtimes.length > 1 && (
                  <div className="showtime-switcher" style={{ marginBottom: 0 }}>
                    <div className="showtime-switcher-label">
                      <ClockIcon className="inline-icon" />
                      Đổi giờ chiếu cùng ngày:
                    </div>
                    <div className="showtime-switcher-list">
                      {siblingShowtimes.map((st) => (
                        <button
                          key={st.showtimeId}
                          type="button"
                          className={`showtime-switcher-btn ${
                            String(st.showtimeId) === String(showtimeId)
                              ? 'showtime-switcher-btn--active'
                              : ''
                          }`}
                          onClick={() => {
                            if (String(st.showtimeId) !== String(showtimeId)) {
                              setSelectedSeats([]);
                              setSelectedFoods({});
                              setShowtimeId(String(st.showtimeId));
                              setCurrentStep('SEATS');
                            }
                          }}
                        >
                          {formatTime(st.startTime)} ({st.roomName})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pos-seat-card">
                  <div className="pos-seat-toolbar">
                    <div className="pos-seat-stats">
                      <span className="pos-seat-stat-pill">
                        Trống:{' '}
                        <strong style={{ color: 'var(--seat-available)' }}>
                          {seatMapStats.available}
                        </strong>
                      </span>
                      <span className="pos-seat-stat-pill">
                        Đang chọn:{' '}
                        <strong style={{ color: 'var(--seat-selected)' }}>
                          {selectedSeats.length}
                        </strong>
                      </span>
                      <span className="pos-seat-stat-pill">
                        Đang giữ:{' '}
                        <strong style={{ color: 'var(--seat-holding)' }}>
                          {seatMapStats.holding}
                        </strong>
                      </span>
                      <span className="pos-seat-stat-pill">
                        Đã bán:{' '}
                        <strong style={{ color: 'var(--seat-booked)' }}>
                          {seatMapStats.booked}
                        </strong>
                      </span>
                    </div>

                    {selectedSeats.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedSeats([])}
                      >
                        Bỏ chọn tất cả ({selectedSeats.length})
                      </button>
                    )}
                  </div>

                  {loadingTickets ? (
                    <div className="loading">
                      <div className="spinner" />
                    </div>
                  ) : (
                    <>
                      <div className="pos-screen-stage">
                        <div className="pos-screen-arc" />
                        <span className="pos-screen-label">Màn hình chiếu</span>
                      </div>

                      <div className="seat-map-wrapper">
                        <div className="seat-map" style={{ padding: '12px 16px 24px' }}>
                          {sortedRows.map(([row, seats]) => (
                            <div key={row} className="seat-row">
                              <span className="seat-row-label">{row}</span>
                              {seats.map((ticket) => {
                                const status = ticket.displayStatus || ticket.ticketStatus;
                                const isAvailable = status === 'AVAILABLE';
                                const isSelected = selectedSeats.includes(ticket.seatId);
                                return (
                                  <button
                                    key={ticket.id || ticket.seatId}
                                    type="button"
                                    disabled={!isAvailable}
                                    aria-pressed={isSelected}
                                    className={getSeatClass(ticket)}
                                    onClick={() => toggleSeat(ticket)}
                                    title={`${ticket.seatCode}${ticket.seatType ? ` (${ticket.seatType})` : ''} • ${formatCurrency(ticket.price)} (${
                                      ticket.displayStatus || ticket.ticketStatus
                                    })`}
                                  >
                                    {ticket.seatNumber || ''}
                                  </button>
                                );
                              })}
                              <span className="seat-row-label">{row}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="seat-legend">
                        <div className="seat-legend-item">
                          <div
                            className="seat-legend-dot"
                            style={{
                              background: 'rgba(16,185,129,0.15)',
                              borderColor: 'var(--seat-available)',
                            }}
                          />
                          Ghế thường
                        </div>
                        <div className="seat-legend-item">
                          <div className="seat-legend-dot seat-legend-dot--vip" />
                          Ghế VIP
                        </div>
                        <div className="seat-legend-item">
                          <div className="seat-legend-dot seat-legend-dot--couple" />
                          Ghế đôi
                        </div>
                        <div className="seat-legend-item">
                          <div
                            className="seat-legend-dot"
                            style={{
                              background: 'rgba(59,130,246,0.3)',
                              borderColor: 'var(--seat-selected)',
                            }}
                          />
                          Đang chọn
                        </div>
                        <div className="seat-legend-item">
                          <div
                            className="seat-legend-dot"
                            style={{
                              background: 'rgba(245,158,11,0.15)',
                              borderColor: 'var(--seat-holding)',
                            }}
                          />
                          Khách khác đang giữ
                        </div>
                        <div className="seat-legend-item">
                          <div
                            className="seat-legend-dot"
                            style={{
                              background: 'rgba(239,68,68,0.15)',
                              borderColor: 'var(--seat-booked)',
                            }}
                          />
                          Đã đặt
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* STEP 3: ADDONS (FOOD & COMBOS) */}
            {currentStep === 'ADDONS' && (
              <div className="card food-select-card" style={{ marginTop: 0 }}>
                <div className="food-select-header">
                  <div>
                    <h2>Chọn bắp nước & Combo</h2>
                    <p>Thêm nhanh đồ ăn kèm vào hóa đơn tại quầy (có thể bỏ qua nếu khách không mua).</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {foodTotal > 0 && <strong>{formatCurrency(foodTotal)}</strong>}
                    {foodQuantity > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedFoods({})}
                      >
                        Xóa bắp nước
                      </button>
                    )}
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
                    const limited = food.stockQuantity != null;
                    const soldOut = limited && food.stockQuantity <= 0;
                    const atLimit = limited && quantity >= food.stockQuantity;

                    return (
                      <div
                        key={food.id}
                        className={`food-option ${quantity > 0 ? 'food-option--selected' : ''}`}
                      >
                        <div className="food-option-media">
                          {food.imageUrl ? (
                            <img src={food.imageUrl} alt={food.name} />
                          ) : (
                            <PopcornIcon size={24} />
                          )}
                        </div>
                        <div className="food-option-body">
                          <h3>{food.name}</h3>
                          {food.description && <p>{food.description}</p>}
                          <strong>{formatCurrency(food.price)}</strong>
                          {limited && (
                            <small style={{ display: 'block', color: soldOut ? '#ef4444' : 'var(--text-muted)' }}>
                              {soldOut ? 'Hết hàng' : `Còn ${food.stockQuantity} phần`}
                            </small>
                          )}

                        </div>
                        <div className="food-stepper">
                          <button
                            type="button"
                            onClick={() => updateFoodQuantity(food.id, -1)}
                            disabled={quantity === 0 || submitting}
                          >
                            -
                          </button>
                          <span>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateFoodQuantity(food.id, 1)}
                            disabled={submitting || soldOut || atLimit}
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

            {/* STEP 4: CHECKOUT & CASH REGISTER */}
            {currentStep === 'CHECKOUT' && (
              <div className="pos-checkout-card">
                {/* Payment Method Cards */}
                <div>
                  <h3 className="pos-section-title">
                    <span>1. Phương thức thanh toán</span>
                    <small>Chọn hình thức thu tiền tại quầy</small>
                  </h3>
                  <div className="pos-payment-methods">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`pos-pay-card ${
                        paymentMethod === 'CASH' ? 'pos-pay-card--active' : ''
                      }`}
                    >
                      <div className="pos-pay-icon">
                        <BanknoteIcon size={22} />
                      </div>
                      <div className="pos-pay-info">
                        <strong>Tiền mặt tại quầy</strong>
                        <span>Thu tiền trực tiếp & in vé ngay</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`pos-pay-card ${
                        paymentMethod === 'CARD' ? 'pos-pay-card--active' : ''
                      }`}
                    >
                      <div className="pos-pay-icon">
                        <CreditCardIcon size={22} />
                      </div>
                      <div className="pos-pay-info">
                        <strong>VNPay / QR Ngân hàng</strong>
                        <span>Chuyển sang cổng thanh toán VNPay</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Quick Cash Calculator (Only for CASH) */}
                {paymentMethod === 'CASH' && (
                  <div className="pos-cash-calc">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CalculatorIcon size={16} />
                        <span>Công cụ tính tiền thừa nhanh (Không bắt buộc)</span>
                      </strong>
                      <div className="pos-cash-presets">
                        {cashPresets.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setCashReceived(String(amount))}
                            className={`pos-cash-preset-btn ${
                              Number(cashReceived) === amount ? 'pos-cash-preset-btn--active' : ''
                            }`}
                          >
                            {amount === finalPrice ? 'Đúng số tiền' : formatCurrency(amount)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pos-cash-row">
                      <div className="pos-field">
                        <label>Tiền khách đưa (VNĐ)</label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          className="input"
                          placeholder={`Nhập số tiền (VD: ${finalPrice})`}
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                        />
                      </div>

                      <div
                        className={`pos-change-box ${
                          cashReceived && cashChange < 0 ? 'pos-change-box--short' : ''
                        }`}
                      >
                        <span>
                          {!cashReceived
                            ? 'Tiền thừa trả khách'
                            : cashChange >= 0
                            ? 'Tiền thừa trả khách'
                            : 'Khách đưa còn thiếu'}
                        </span>
                        <strong>
                          {!cashReceived
                            ? formatCurrency(0)
                            : formatCurrency(Math.abs(cashChange))}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Promotion Code */}
                <div>
                  <div className="pos-section-title">
                    <span>2. Mã khuyến mãi / Voucher</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={handleShowPromos}
                      style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                    >
                      <GiftIcon size={15} />
                      <span>{showPromos ? 'Đóng danh sách mã' : 'Xem mã khả dụng'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Nhập mã giảm giá (nếu có)..."
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase', flex: 1 }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && (e.preventDefault(), handleValidatePromo())
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleValidatePromo}
                      disabled={validatingPromo || !promoCode.trim()}
                    >
                      {validatingPromo ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                  {promoError && (
                    <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 6 }}>
                      {promoError}
                    </div>
                  )}

                  {showPromos && (
                    <div
                      style={{
                        marginTop: 12,
                        background: '#f8fafc',
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        maxHeight: 210,
                        overflowY: 'auto',
                      }}
                    >
                      {loadingPromos ? (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                          }}
                        >
                          Đang tải...
                        </div>
                      ) : availablePromos.length === 0 ? (
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                          }}
                        >
                          Không có mã khuyến mãi khả dụng
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {availablePromos.map((promo) => (
                            <div
                              key={promo.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#ffffff',
                                padding: '8px 12px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                border: '1px solid var(--border)',
                              }}
                              onClick={() => {
                                setPromoCode(promo.code);
                                setShowPromos(false);
                              }}
                            >
                              <div>
                                <strong style={{ color: 'var(--seat-available)' }}>
                                  {promo.code}
                                </strong>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {promo.description || `Giảm ${promo.discountPercent}%`}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  color: 'var(--blue)',
                                }}
                              >
                                Chọn mã
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="pos-section-title">
                    <span>3. Thông tin khách hàng (Tùy chọn)</span>
                    <small>Dùng để gửi vé điện tử hoặc tra cứu bảo hành vé</small>
                  </h3>
                  <div className="pos-customer-grid">
                    <div className="pos-field">
                      <label>Họ và tên khách</label>
                      <input
                        className="input"
                        placeholder="Khách vãng lai"
                        value={customer.customerName}
                        onChange={(e) =>
                          setCustomer({ ...customer, customerName: e.target.value })
                        }
                      />
                    </div>
                    <div className="pos-field">
                      <label>Số điện thoại</label>
                      <input
                        className="input"
                        placeholder="09xx..."
                        value={customer.customerPhone}
                        onChange={(e) =>
                          setCustomer({ ...customer, customerPhone: e.target.value })
                        }
                      />
                    </div>
                    <div className="pos-field">
                      <label>Email nhận vé</label>
                      <input
                        className="input"
                        placeholder="example@email.com"
                        value={customer.customerEmail}
                        onChange={(e) =>
                          setCustomer({ ...customer, customerEmail: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT STICKY POS RECEIPT SIDEBAR */}
          <aside className="pos-receipt">
            <div className="pos-receipt-banner">
              <div className="pos-receipt-banner-title">
                <TicketIcon style={{ width: 18, height: 18 }} />
                <span>Phiếu thanh toán quầy</span>
              </div>
              {(showtimeId || selectedSeats.length > 0 || foodQuantity > 0) && (
                <button type="button" className="pos-receipt-reset" onClick={handleResetOrder}>
                  Làm mới
                </button>
              )}
            </div>

            {/* Movie & Showtime Header */}
            <div className="pos-receipt-movie">
              {selectedShowtime && (
                <SafeImage
                  src={posterUrl}
                  alt={selectedShowtime.movieName}
                  className="pos-receipt-poster"
                />
              )}
              <div className="pos-receipt-movie-info">
                <h3>
                  {selectedShowtime ? selectedShowtime.movieName : 'Chưa chọn suất chiếu'}
                </h3>
                {selectedShowtime ? (
                  <div className="pos-receipt-meta">
                    <span>
                      Rạp: <strong>{selectedShowtime.branchName}</strong>
                    </span>
                    <span>
                      Phòng:{' '}
                      <strong>
                        {selectedShowtime.roomName}
                        {selectedShowtime.roomTechnology ? ` (${formatScreening(selectedShowtime.screeningFormat, selectedShowtime.roomTechnology)})` : ''}
                      </strong>
                    </span>
                    <span>
                      Suất:{' '}
                      <strong style={{ color: 'var(--blue)' }}>
                        {formatTime(selectedShowtime.startTime)}
                      </strong>{' '}
                      • {formatDate(selectedShowtime.startTime)}
                    </span>
                  </div>
                ) : (
                  <div className="pos-receipt-empty">
                    Vui lòng chọn một suất chiếu ở bảng bên trái để bắt đầu tạo hóa đơn.
                  </div>
                )}
              </div>
            </div>

            {/* Selected Seats Section */}
            <div className="pos-receipt-section">
              <div className="pos-receipt-section-head">
                <span>Ghế đã chọn ({selectedSeats.length})</span>
                {selectedSeats.length > 0 && <span>{formatCurrency(seatTotal)}</span>}
              </div>

              {selectedSeatTickets.length === 0 ? (
                <div className="pos-receipt-empty">Chưa chọn ghế nào</div>
              ) : (
                <>
                  <div className="pos-seat-chips">
                    {selectedSeatTickets.map((t) => (
                      <span key={t.seatId} className="pos-seat-chip">
                        {t.seatCode || `${t.rowLabel || ''}${t.seatNumber || ''}`}
                        <button
                          type="button"
                          onClick={() => toggleSeat(t)}
                          title="Bỏ ghế này"
                        >
                          <XIcon size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  {seatGroups.map(([type, data]) => (
                    <div key={type} className="pos-receipt-line">
                      <span className="pos-receipt-line-name">
                        {data.seats.length}x {type}
                      </span>
                      <span className="pos-receipt-line-price">
                        {formatCurrency(data.price * data.seats.length)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Selected Foods Section */}
            <div className="pos-receipt-section">
              <div className="pos-receipt-section-head">
                <span>Bắp nước kèm ({foodQuantity})</span>
                {foodTotal > 0 && <span>{formatCurrency(foodTotal)}</span>}
              </div>

              {selectedFoodItems.length === 0 ? (
                <div className="pos-receipt-empty">Không có đồ ăn kèm</div>
              ) : (
                selectedFoodItems.map((food) => (
                  <div key={food.id} className="pos-receipt-line">
                    <span className="pos-receipt-line-name">
                      {food.quantity}x {food.name}
                    </span>
                    <span className="pos-receipt-line-price">
                      {formatCurrency(food.price * food.quantity)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Totals Summary */}
            <div className="pos-receipt-summary">
              <div className="pos-receipt-line">
                <span style={{ color: '#64748b' }}>Tạm tính</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              {promoDiscount > 0 && (
                <div className="pos-receipt-line" style={{ color: 'var(--green)' }}>
                  <span>Mã giảm giá ({promoCode})</span>
                  <strong>-{formatCurrency(promoDiscount)}</strong>
                </div>
              )}
              <div className="pos-receipt-total-row">
                <span>Tổng thu</span>
                <strong>{formatCurrency(finalPrice)}</strong>
              </div>
            </div>

            {/* Step Navigation Buttons */}
            <div className="pos-receipt-actions">
              {currentStep === 'SELECTION' && (
                <button
                  type="button"
                  className="btn btn-primary seat-sidebar-btn"
                  style={{ width: '100%' }}
                  disabled={!canContinueSelection}
                  onClick={continueFromSelection}
                >
                  <span>Tiếp tục chọn ghế</span>
                  <ArrowRightIcon size={16} />
                </button>
              )}

              {currentStep === 'SEATS' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary seat-sidebar-btn"
                    onClick={() => setCurrentStep('SELECTION')}
                  >
                    <ArrowLeftIcon size={16} />
                    <span>Đổi suất</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary seat-sidebar-btn"
                    disabled={!canContinueSeats}
                    onClick={continueFromSeats}
                  >
                    <span>Tiếp tục</span>
                    <ArrowRightIcon size={16} />
                  </button>
                </>
              )}

              {currentStep === 'ADDONS' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary seat-sidebar-btn"
                    onClick={() => setCurrentStep('SEATS')}
                  >
                    <ArrowLeftIcon size={16} />
                    <span>Sơ đồ ghế</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary seat-sidebar-btn"
                    onClick={continueToCheckout}
                  >
                    <span>Sang thanh toán</span>
                    <ArrowRightIcon size={16} />
                  </button>
                </>
              )}

              {currentStep === 'CHECKOUT' && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary seat-sidebar-btn"
                    onClick={() => setCurrentStep(foods.length > 0 ? 'ADDONS' : 'SEATS')}
                  >
                    <ArrowLeftIcon size={16} />
                    <span>Quay lại</span>
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary seat-sidebar-btn"
                    disabled={submitting}
                  >
                    {submitting ? (
                      'Đang xử lý...'
                    ) : paymentMethod === 'CASH' ? (
                      <>
                        <CheckIcon size={16} />
                        <span>Thu tiền & Xuất vé</span>
                      </>
                    ) : (
                      'Chuyển sang VNPay'
                    )}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom bar */}
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
              {submitting ? 'Đang xử lý...' : 'Xuất vé'}
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
