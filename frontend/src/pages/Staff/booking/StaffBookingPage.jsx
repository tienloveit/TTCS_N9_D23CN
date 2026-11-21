import { formatScreening } from '../../../utils/cinemaFormats';
import {
  addDaysToDateKey,
  cinemaTodayKey,
  dateKeyParts,
  getCinemaHour,
  parseLocalDateTime,
} from '../../../utils/cinemaTime';
import { MAX_FOOD_QUANTITY } from '../../../utils/bookingLimits';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../../../context/useAuth';
import { bookingApi, foodApi, movieApi, showtimeApi, ticketApi, promotionApi, staffApi, vnpayApi } from '../../../api';
import { API_BASE_URL } from '../../../api/axiosClient';
import { StaffPageHeading, StaffSkeleton, StaffState } from '../StaffUI';
import {
  CheckIcon,
  TicketIcon,
} from '../../../components/Common/CinemaIcons';

import {
  formatCurrency,
  formatTime,
  toLocalDateKey,
  buildPrintDocument,
  customerContactKey,
  hasCustomerContact,
} from './staffBookingUtils';
import StaffReceiptSidebar from './StaffReceiptSidebar';
import StaffCheckoutStep from './StaffCheckoutStep';
import StaffAddonsStep from './StaffAddonsStep';
import StaffSeatStep from './StaffSeatStep';
import StaffShowtimeStep from './StaffShowtimeStep';
import StaffSaleComplete from './StaffSaleComplete';
import StaffVnpayPanel from './StaffVnpayPanel';
import './StaffBooking.css';

export default function StaffBookingPage() {
  const { user, isAdmin } = useAuth();

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
  // Tra cứu khách theo SĐT/email: { key, status: 'checking'|'none'|'found'|'error', data, message }.
  const [customerLookup, setCustomerLookup] = useState(null);
  const [confirmedCustomerId, setConfirmedCustomerId] = useState(null);
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
  // Đơn VNPay tại quầy đang chờ khách trả: { booking, paymentUrl, status: 'WAITING'|'FAILED', message }.
  const [vnpaySale, setVnpaySale] = useState(null);
  const [vnpayBusy, setVnpayBusy] = useState(false);
  const [error, setError] = useState('');
  const [foodError, setFoodError] = useState('');
  const stompClient = useRef(null);
  const submissionPending = useRef(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [catalogError, setCatalogError] = useState('');
  const [ticketAttempt, setTicketAttempt] = useState(0);
  const [ticketError, setTicketError] = useState('');

  // Xuất vé và xóa đơn đang soạn; chỉ dùng hàm setState nên ổn định giữa các lần render.
  const completeSale = useCallback((booking) => {
    setLastBooking(booking);
    setVnpaySale(null);
    setSelectedSeats([]);
    setSelectedFoods({});
    setCustomer({ customerName: '', customerEmail: '', customerPhone: '' });
    setCustomerLookup(null);
    setConfirmedCustomerId(null);
    setPromoCode('');
    setPromoDiscount(0);
    setPromoError('');
    setCashReceived('');
  }, []);

  // Theo dõi đơn VNPay tại quầy: trang kết quả VNPay (tab khác hoặc điện thoại khách) xác nhận thanh toán.
  const vnpayBookingId = vnpaySale?.booking.bookingId;
  const vnpayWaiting = vnpaySale?.status === 'WAITING';
  useEffect(() => {
    if (!vnpayWaiting || vnpayBookingId == null) return undefined;
    let stopped = false;
    const check = async () => {
      try {
        const res = await bookingApi.getById(vnpayBookingId);
        const latest = res.data.result;
        if (stopped || !latest) return;
        if (latest.status === 'COMPLETED' && latest.paymentStatus === 'PAID') {
          completeSale(latest);
          toast.success('Khách đã thanh toán VNPay, vé đã được xuất');
        } else if (['CANCELLED', 'EXPIRED', 'REFUND_REQUESTED'].includes(latest.status)) {
          setVnpaySale((sale) => sale && {
            ...sale,
            booking: { ...sale.booking, ...latest },
            status: 'FAILED',
            message: latest.status === 'REFUND_REQUESTED'
              ? 'VNPay báo thanh toán sau khi hết thời gian giữ ghế. Đơn đã chuyển sang chờ hoàn tiền, báo quản lý chi nhánh xử lý.'
              : 'Giao dịch đã bị hủy hoặc hết thời gian giữ ghế. Ghế đã được trả lại, có thể bán lại cho khách.',
          });
        }
      } catch {
        // Lỗi mạng tạm thời: lần kiểm tra sau sẽ thử lại.
      }
    };
    const timer = setInterval(check, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [completeSale, vnpayBookingId, vnpayWaiting]);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([showtimeApi.getAll(), foodApi.getAll(), movieApi.getAll({ size: 200 })])
      .then(([showtimeResult, foodResult, movieResult]) => {
        if (!mounted) return;

        if (showtimeResult.status === 'fulfilled') {
          setShowtimes(showtimeResult.value.data.result || []);
        } else {
          setCatalogError('Không tải được danh sách suất chiếu.');
        }

        if (foodResult.status === 'fulfilled') {
          setFoods((foodResult.value.data.result || []).filter((food) => food.active !== false));
          setFoodError('');
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
  }, [catalogAttempt]);

  useEffect(() => {
    setTicketError('');
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
        if (mounted) setTicketError('Không tải được sơ đồ ghế.');
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
  }, [showtimeId, ticketAttempt]);

  function isShowtimeAvailable(showtime) {
    const now = new Date();
    const startTime = parseLocalDateTime(showtime.startTime);
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
    const todayKey = cinemaTodayKey();
    for (let i = 0; i < 7; i += 1) {
      const key = addDaysToDateKey(todayKey, i);
      const { weekday, dd, mm } = dateKeyParts(key);
      const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : weekdaysShort[weekday];
      days.push({ key, label, display: `${dd}/${mm}` });
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
        const startTime = parseLocalDateTime(showtime.startTime);
        if (!startTime) return false;
        const hour = getCinemaHour(startTime);

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

  const detailFilterCount = [
    Boolean(dateFilter), branchFilter !== 'ALL', timeFilter !== 'ALL',
    statusFilter !== 'AVAILABLE', roomTypeFilter !== 'ALL',
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(searchQuery || detailFilterCount);

  const canContinueSelection = Boolean(showtimeId);
  const canContinueSeats = selectedSeats.length > 0;

  const stepItems = [
    { key: 'SELECTION', label: 'Suất chiếu', badge: selectedShowtime ? '1' : null },
    { key: 'SEATS', label: 'Chọn ghế', badge: selectedSeats.length > 0 ? String(selectedSeats.length) : null },
    { key: 'ADDONS', label: 'Bắp nước', badge: foodQuantity > 0 ? String(foodQuantity) : null },
    { key: 'CHECKOUT', label: 'Thanh toán & xuất vé', badge: null },
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
    submissionPending.current = false;
    setSelectedSeats([]);
    setSelectedFoods({});
    setPromoCode('');
    setPromoDiscount(0);
    setPromoError('');
    setCashReceived('');
    resetCustomer();
    setCurrentStep('SELECTION');
    setShowtimeId('');
  };

  const resetCustomer = () => {
    setCustomer({ customerName: '', customerEmail: '', customerPhone: '' });
    setCustomerLookup(null);
    setConfirmedCustomerId(null);
  };

  // Đổi SĐT/email thì kết quả tra cứu và xác nhận cũ không còn giá trị.
  const updateCustomer = (next) => {
    setCustomer(next);
    if (customerContactKey(next) !== customerContactKey(customer)) {
      setCustomerLookup(null);
      setConfirmedCustomerId(null);
    }
  };

  const lookupCustomer = async (target = customer) => {
    if (!hasCustomerContact(target)) {
      setCustomerLookup(null);
      return null;
    }
    const key = customerContactKey(target);
    if (customerLookup?.key === key && ['found', 'none'].includes(customerLookup.status)) return customerLookup;
    setCustomerLookup({ key, status: 'checking' });
    let next;
    try {
      const res = await staffApi.lookupCustomer({
        email: target.customerEmail.trim(),
        phone: target.customerPhone.trim(),
      });
      const data = res.data.result;
      next = { key, status: data?.matched ? 'found' : 'none', data };
    } catch (err) {
      next = { key, status: 'error', message: err.response?.data?.message || 'Không kiểm tra được thông tin khách' };
    }
    // Nhân viên đã sửa SĐT/email trong lúc chờ thì bỏ kết quả cũ.
    setCustomerLookup((previous) => (previous?.key === key ? next : previous));
    return next;
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
      const maxQuantity = Math.min(MAX_FOOD_QUANTITY, stock == null ? Infinity : Math.max(0, stock));
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
    if (submissionPending.current || currentStep !== 'CHECKOUT' || lastBooking) return;

    if (!showtimeId) {
      toast.error('Chọn suất chiếu');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Chọn ít nhất 1 ghế');
      return;
    }

    submissionPending.current = true;
    // SĐT/email trùng tài khoản có sẵn: phải xác nhận đúng khách, tránh gắn vé và email QR cho người khác.
    let confirmedId;
    if (hasCustomerContact(customer)) {
      const lookup = await lookupCustomer(customer);
      let blocker = null;
      if (!lookup || lookup.status === 'error') blocker = lookup?.message || 'Không kiểm tra được thông tin khách';
      else if (lookup.status === 'found' && confirmedCustomerId !== lookup.data.customerId) {
        blocker = 'Thông tin liên hệ trùng một tài khoản. Hỏi lại khách và bấm "Đúng khách này" trước khi thu tiền.';
      }
      if (blocker) {
        submissionPending.current = false;
        toast.info(blocker);
        return;
      }
      if (lookup.status === 'found') confirmedId = lookup.data.customerId;
    }
    let bookingConfirmed = false;
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
        confirmedCustomerId: confirmedId,
      });
      const booking = res.data.result;
      if (booking?.bookingId == null) {
        setError('Chưa nhận được xác nhận. Hãy tra cứu đơn vé trước khi gửi lại.');
        return;
      }
      bookingConfirmed = true;
      if (paymentMethod === 'VNPAY') {
        // Ở lại màn quầy: hiện QR/cổng VNPay và tự chuyển sang xuất vé khi khách thanh toán xong.
        setVnpaySale({ booking, paymentUrl: await requestPaymentUrl(booking), status: 'WAITING' });
        return;
      }
      completeSale(booking);
      toast.success('Đặt vé tại quầy thành công');
    } catch (err) {
      const message = err.response?.data?.message || (!err.response
        ? 'Chưa xác nhận được đơn. Hãy kiểm tra kết nối và tra cứu đơn vé trước khi gửi lại.'
        : 'Đặt vé thất bại');
      setError(message);
      toast.error(message);
    } finally {
      if (!bookingConfirmed) submissionPending.current = false;
      setSubmitting(false);
    }
  };

  const requestPaymentUrl = async (booking) => {
    try {
      const res = await vnpayApi.createPaymentUrl({ bookingId: booking.bookingId, amount: booking.totalAmount, bankCode: '' });
      return res.data.result?.paymentUrl || null;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tạo được liên kết thanh toán VNPay');
      return null;
    }
  };

  const retryPaymentLink = async () => {
    if (!vnpaySale) return;
    setVnpayBusy(true);
    const paymentUrl = await requestPaymentUrl(vnpaySale.booking);
    setVnpaySale((sale) => (sale ? { ...sale, paymentUrl } : sale));
    setVnpayBusy(false);
  };

  const openVnpayGateway = () => {
    if (!vnpaySale?.paymentUrl) return;
    const opened = window.open(vnpaySale.paymentUrl, '_blank', 'noopener');
    if (!opened) toast.info('Trình duyệt chặn cửa sổ mới. Cho phép popup hoặc để khách quét mã QR.');
  };

  // Hủy đơn chờ để trả ghế ngay; giữ nguyên ghế/món đã chọn để nhân viên đổi sang tiền mặt nếu cần.
  const cancelVnpaySale = async () => {
    if (!vnpaySale) return;
    setVnpayBusy(true);
    try {
      await bookingApi.cancel(vnpaySale.booking.bookingId);
      toast.info('Đã hủy giao dịch VNPay, ghế đã được trả lại');
      setVnpaySale(null);
      submissionPending.current = false;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không hủy được giao dịch. Kiểm tra lại trạng thái đơn.');
    } finally {
      setVnpayBusy(false);
    }
  };

  const backFromVnpay = () => {
    setVnpaySale(null);
    submissionPending.current = false;
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

  if (loading) return <StaffSkeleton label="Đang tải lịch chiếu" />;
  if (catalogError) return <StaffState title={catalogError} error onRetry={() => {
    setCatalogError('');
    setLoading(true);
    setCatalogAttempt((attempt) => attempt + 1);
  }} />;

  const activeIndex = stepItems.findIndex((item) => item.key === currentStep);
  const posterUrl =
    selectedShowtime?.thumbnailUrl ||
    selectedMovieMeta?.thumbnailUrl ||
    selectedMovieMeta?.posterUrl ||
    '';

  return (
    <form onSubmit={(event) => event.preventDefault()} className="pos-page">
      {/* ===== TOP POS CONTROL BAR ===== */}
      {!lastBooking && !vnpaySale && (
        <div className="pos-top-bar">
          <StaffPageHeading icon={TicketIcon} title="Bán vé tại quầy"
            description={selectedShowtime
              ? `${selectedShowtime.movieName} · ${formatTime(selectedShowtime.startTime)} · ${selectedShowtime.roomName || 'Phòng chiếu'}`
              : 'Chọn phim và suất chiếu để bắt đầu bán vé.'} />

          <div className="pos-stepper" role="group" aria-label="Các bước bán vé">
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
                  disabled={disabled || submitting}
                  aria-current={isActive ? 'step' : undefined}
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

      {error && <div className="error-message" role="alert">{error}</div>}

      {lastBooking ? (
        <StaffSaleComplete
          booking={lastBooking}
          onPrint={handlePrintLastBooking}
          onNewSale={() => {
            setLastBooking(null);
            handleResetOrder();
          }}
        />
      ) : vnpaySale ? (
        <StaffVnpayPanel
          busy={vnpayBusy}
          onBack={backFromVnpay}
          onCancel={cancelVnpaySale}
          onOpenGateway={openVnpayGateway}
          onRetryLink={retryPaymentLink}
          sale={vnpaySale}
        />
      ) : (
        /* ===== 2-COLUMN POS WORKSPACE ===== */
        <div className="pos-workspace">
          {/* LEFT WORKSPACE */}
          <div className="pos-main">
            {/* STEP 1: SHOWTIME SELECTION */}
            {currentStep === 'SELECTION' && (
              <StaffShowtimeStep
                branchFilter={branchFilter}
                branchOptions={branchOptions}
                clearFilters={clearFilters}
                dateFilter={dateFilter}
                detailFilterCount={detailFilterCount}
                filteredShowtimes={filteredShowtimes}
                handleBranchFilterChange={handleBranchFilterChange}
                handleSelectShowtime={handleSelectShowtime}
                hasActiveFilters={hasActiveFilters}
                isShowtimeAvailable={isShowtimeAvailable}
                movieGroups={movieGroups}
                quickDates={quickDates}
                roomTypeFilter={roomTypeFilter}
                roomTypeOptions={roomTypeOptions}
                searchQuery={searchQuery}
                setDateFilter={setDateFilter}
                setRoomTypeFilter={setRoomTypeFilter}
                setSearchQuery={setSearchQuery}
                setStatusFilter={setStatusFilter}
                setTimeFilter={setTimeFilter}
                showtimeId={showtimeId}
                statusFilter={statusFilter}
                timeFilter={timeFilter}
              />
            )}

            {/* STEP 2: SEAT MAP SELECTION */}
            {currentStep === 'SEATS' && (
              <StaffSeatStep
                getSeatClass={getSeatClass}
                loadingTickets={loadingTickets}
                seatMapStats={seatMapStats}
                selectedSeats={selectedSeats}
                setCurrentStep={setCurrentStep}
                setLoadingTickets={setLoadingTickets}
                setSelectedFoods={setSelectedFoods}
                setSelectedSeats={setSelectedSeats}
                setShowtimeId={setShowtimeId}
                setTicketAttempt={setTicketAttempt}
                setTicketError={setTicketError}
                showtimeId={showtimeId}
                siblingShowtimes={siblingShowtimes}
                sortedRows={sortedRows}
                ticketError={ticketError}
                toggleSeat={toggleSeat}
              />
            )}

            {/* STEP 3: ADDONS (FOOD & COMBOS) */}
            {currentStep === 'ADDONS' && (
              <StaffAddonsStep
                foodError={foodError}
                foodQuantity={foodQuantity}
                foodTotal={foodTotal}
                foods={foods}
                selectedFoods={selectedFoods}
                setSelectedFoods={setSelectedFoods}
                submitting={submitting}
                updateFoodQuantity={updateFoodQuantity}
              />
            )}

            {/* STEP 4: CHECKOUT & CASH REGISTER */}
            {currentStep === 'CHECKOUT' && (
              <StaffCheckoutStep
                availablePromos={availablePromos}
                cashChange={cashChange}
                cashPresets={cashPresets}
                cashReceived={cashReceived}
                confirmedCustomerId={confirmedCustomerId}
                customer={customer}
                customerLookup={customerLookup}
                finalPrice={finalPrice}
                onConfirmCustomer={setConfirmedCustomerId}
                onLookupCustomer={() => lookupCustomer(customer)}
                handleShowPromos={handleShowPromos}
                handleValidatePromo={handleValidatePromo}
                loadingPromos={loadingPromos}
                paymentMethod={paymentMethod}
                promoCode={promoCode}
                promoError={promoError}
                setCashReceived={setCashReceived}
                setCustomer={updateCustomer}
                setPaymentMethod={setPaymentMethod}
                setPromoCode={setPromoCode}
                setShowPromos={setShowPromos}
                showPromos={showPromos}
                validatingPromo={validatingPromo}
              />
            )}
          </div>

          {/* RIGHT STICKY POS RECEIPT SIDEBAR */}
          <StaffReceiptSidebar
            canContinueSeats={canContinueSeats}
            canContinueSelection={canContinueSelection}
            continueFromSeats={continueFromSeats}
            continueFromSelection={continueFromSelection}
            continueToCheckout={continueToCheckout}
            currentStep={currentStep}
            finalPrice={finalPrice}
            foodQuantity={foodQuantity}
            foodTotal={foodTotal}
            foods={foods}
            handleResetOrder={handleResetOrder}
            handleSubmit={handleSubmit}
            paymentMethod={paymentMethod}
            posterUrl={posterUrl}
            promoCode={promoCode}
            promoDiscount={promoDiscount}
            seatGroups={seatGroups}
            seatTotal={seatTotal}
            selectedFoodItems={selectedFoodItems}
            selectedSeatTickets={selectedSeatTickets}
            selectedSeats={selectedSeats}
            selectedShowtime={selectedShowtime}
            setCurrentStep={setCurrentStep}
            showtimeId={showtimeId}
            submitting={submitting}
            toggleSeat={toggleSeat}
          />
        </div>
      )}

      {/* Mobile bottom bar */}
      {!lastBooking && !vnpaySale && (
        <div className="booking-bar seat-page-mobile-bar">
          <span>
            <strong>{selectedSeats.length}</strong> ghế
          </span>
          {foodQuantity > 0 && (
            <span>
              <strong>{foodQuantity}</strong> món
            </span>
          )}
          <span className="pos-mobile-total">{formatCurrency(finalPrice)}</span>
          {currentStep === 'CHECKOUT' ? (
            <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Đang xử lý…' : paymentMethod === 'CASH' ? 'Thu tiền & xuất vé' : 'Tạo giao dịch VNPay'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={currentStep === 'SELECTION' ? !canContinueSelection : currentStep === 'SEATS' && !canContinueSeats}
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
