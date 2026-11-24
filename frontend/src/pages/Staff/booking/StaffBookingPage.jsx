import {
  addDaysToDateKey,
  cinemaTodayKey,
  dateKeyParts,
  getCinemaHour,
  parseLocalDateTime,
} from '../../../utils/cinemaTime';
import { MAX_FOOD_QUANTITY } from '../../../utils/bookingLimits';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../../../context/useAuth';
import { bookingApi, foodApi, movieApi, showtimeApi, ticketApi, promotionApi, staffApi, vnpayApi } from '../../../api';
import { API_BASE_URL } from '../../../api/axiosClient';
import { StaffSkeleton, StaffState } from '../StaffUI';
import { CheckIcon } from '../../../components/Common/CinemaIcons';

import {
  formatCurrency,
  formatDate,
  toLocalDateKey,
  buildPrintDocument,
  customerContactKey,
  hasCustomerContact,
  pickAdjacentSeats,
} from './staffBookingUtils';
import StaffReceiptSidebar from './StaffReceiptSidebar';
import StaffCheckoutStep from './StaffCheckoutStep';
import StaffAddonsStep from './StaffAddonsStep';
import StaffSeatStep from './StaffSeatStep';
import StaffShowtimeStep from './StaffShowtimeStep';
import StaffSaleComplete from './StaffSaleComplete';
import StaffVnpayPanel from './StaffVnpayPanel';
import './StaffBooking.css';

// Quầy được bán tới 15 phút sau giờ chiếu, khớp BookingCheckoutService.STAFF_SALE_GRACE_MINUTES.
function isShowtimeAvailable(showtime) {
  const now = new Date();
  const startTime = parseLocalDateTime(showtime.startTime);
  if (!startTime) return false;
  const cutoffTime = new Date(startTime.getTime() + 15 * 60 * 1000);
  const notExpired = now < cutoffTime;
  const statusOk = !showtime.status || showtime.status === 'OPEN';
  return notExpired && statusOk;
}

export default function StaffBookingPage() {
  const { user, isAdmin } = useAuth();
  // Nút "Bán vé suất này" ở trang tổng quan mở trang với ?showtime=<id>: chọn sẵn suất đó khi danh mục tải xong.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedShowtimeId = useRef(searchParams.get('showtime'));

  const [showtimes, setShowtimes] = useState([]);
  const [moviesMap, setMoviesMap] = useState({});
  const [foods, setFoods] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showtimeId, setShowtimeId] = useState('');
  // Ba bước: SELECTION (suất chiếu) → SEATS (ghế, tab bắp nước) → CHECKOUT (thu tiền).
  const [currentStep, setCurrentStep] = useState('SELECTION');
  const [seatTab, setSeatTab] = useState('seats');
  const [quickCount, setQuickCount] = useState(2);

  // Filters
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(() => cinemaTodayKey());
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');

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

  // Promotions: promoCode là ô nhập, appliedPromo là mã backend đã xác nhận cho giỏ hiện tại.
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const promosRequested = useRef(false);

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
  const selectedSeatsRef = useRef(selectedSeats);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);
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
    setAppliedPromo('');
    setPromoDiscount(0);
    setPromoError('');
    setCashReceived('');
    setSeatTab('seats');
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
          const list = showtimeResult.value.data.result || [];
          setShowtimes(list);

          const requestedId = requestedShowtimeId.current;
          if (requestedId) {
            requestedShowtimeId.current = null;
            const requested = list.find((item) => String(item.showtimeId) === requestedId);
            if (requested && isShowtimeAvailable(requested)) {
              setShowtimeId(String(requested.showtimeId));
              setCurrentStep('SEATS');
            } else {
              toast.info('Suất chiếu này không còn bán tại quầy, vui lòng chọn suất khác.');
            }
          }
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
            // Ghế đang chọn bị đặt ở nơi khác: bỏ khỏi đơn và báo để nhân viên chọn lại, tổng tiền đổi theo.
            if (selectedSeatsRef.current.includes(event.seatId)) {
              toast.warning('Một ghế bạn chọn vừa được đặt ở nơi khác và đã bị bỏ khỏi đơn.');
            }
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

  // Đã ghi nhận suất được yêu cầu: bỏ ?showtime khỏi URL để tải lại trang hay bấm "Đổi suất" không chọn lại suất cũ.
  useEffect(() => {
    if (!searchParams.has('showtime')) return;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete('showtime');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

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

  // Suất thuộc phạm vi bán của quầy: chi nhánh của nhân viên, hoặc chi nhánh ADMIN đang lọc.
  const scopedShowtimes = useMemo(() => {
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
    return result;
  }, [showtimes, isAdmin, user, branchFilter]);

  // "Sắp bắt đầu": 4 suất gần nhất còn bán được, kể cả suất vừa chiếu trong thời gian quầy còn bán.
  const soonShowtimes = useMemo(
    () => scopedShowtimes
      .filter((showtime) => isShowtimeAvailable(showtime) && showtime.availableSeats !== 0)
      .sort((a, b) => (parseLocalDateTime(a.startTime)?.getTime() ?? 0) - (parseLocalDateTime(b.startTime)?.getTime() ?? 0))
      .slice(0, 4),
    [scopedShowtimes]
  );

  const filteredShowtimes = useMemo(() => {
    let result = scopedShowtimes;

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

    return result;
  }, [scopedShowtimes, searchQuery, dateFilter, timeFilter, statusFilter]);

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
          ageRating: st.ageRating || meta.ageRating || null,
          duration: meta.duration || meta.durationMinutes || null,
          language: meta.language || null,
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

  // cashReceived chỉ giữ chữ số; để trống nghĩa là khách đưa đúng số tiền.
  const numericCashReceived = Number(cashReceived || 0);
  const cashChange = numericCashReceived - finalPrice;

  // Giá thấp nhất của từng loại ghế trong suất, hiện trong chú thích sơ đồ.
  const seatPrices = useMemo(() => tickets.reduce((prices, ticket) => {
    const type = ticket.seatType || 'STANDARD';
    const price = Number(ticket.price || 0);
    if (prices[type] == null || price < prices[type]) prices[type] = price;
    return prices;
  }, {}), [tickets]);

  const hasActiveFilters = Boolean(
    searchQuery || dateFilter !== cinemaTodayKey() || branchFilter !== 'ALL'
    || timeFilter !== 'ALL' || statusFilter !== 'AVAILABLE'
  );

  const canContinueSelection = Boolean(showtimeId);
  const canContinueSeats = selectedSeats.length > 0;

  const stepItems = [
    { key: 'SELECTION', label: 'Suất chiếu' },
    { key: 'SEATS', label: 'Ghế và bắp nước' },
    { key: 'CHECKOUT', label: 'Thu tiền' },
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
      setAppliedPromo('');
      setPromoError('Giỏ hàng thay đổi, vui lòng áp dụng lại mã');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const handleSelectShowtime = (st, jumpToSeats = false) => {
    if (!isShowtimeAvailable(st)) return;
    const nextId = String(st.showtimeId);
    setShowtimeId(nextId);
    if (jumpToSeats) {
      setSeatTab('seats');
      setCurrentStep('SEATS');
    }
  };

  // Mã khả dụng hiện sẵn ở bước thu tiền; chỉ tải một lần mỗi phiên quầy (lỗi thì lần sau thử lại).
  const loadPromos = async () => {
    if (promosRequested.current) return;
    promosRequested.current = true;
    setLoadingPromos(true);
    try {
      const res = await promotionApi.getAvailable();
      setAvailablePromos(res.data.result || []);
    } catch {
      promosRequested.current = false;
    } finally {
      setLoadingPromos(false);
    }
  };

  const goToCheckout = () => {
    setCurrentStep('CHECKOUT');
    void loadPromos();
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
    goToCheckout();
  };

  const handleResetOrder = () => {
    submissionPending.current = false;
    setSelectedSeats([]);
    setSelectedFoods({});
    setPromoCode('');
    setAppliedPromo('');
    setPromoDiscount(0);
    setPromoError('');
    setCashReceived('');
    resetCustomer();
    setSeatTab('seats');
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

  // Áp mã từ ô nhập, hoặc từ chip mã khả dụng (truyền code). Giảm giá do backend tính.
  const handleValidatePromo = async (pickedCode) => {
    const code = (pickedCode ?? promoCode).trim().toUpperCase();
    if (pickedCode) setPromoCode(code);
    if (!code) {
      clearPromo();
      return;
    }
    if (total === 0) {
      setPromoError('Vui lòng chọn ghế trước khi áp dụng mã');
      return;
    }
    setValidatingPromo(true);
    setPromoError('');
    try {
      const res = await promotionApi.validate({ code, orderAmount: total });
      setPromoDiscount(Number(res.data.result.discountAmount));
      setAppliedPromo(code);
    } catch (err) {
      setPromoDiscount(0);
      setAppliedPromo('');
      setPromoError(err.response?.data?.message || 'Mã không hợp lệ');
    } finally {
      setValidatingPromo(false);
    }
  };

  const clearPromo = () => {
    setPromoCode('');
    setAppliedPromo('');
    setPromoDiscount(0);
    setPromoError('');
  };

  const applyQuickPick = () => {
    const seatIds = pickAdjacentSeats(sortedRows, quickCount);
    if (seatIds.length === 0) {
      toast.info(`Không còn ${quickCount} ghế liền nhau cùng loại. Hãy chọn trực tiếp trên sơ đồ.`);
      return;
    }
    setSelectedSeats(seatIds);
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
    setDateFilter(cinemaTodayKey());
    setBranchFilter('ALL');
    setTimeFilter('ALL');
    setStatusFilter('AVAILABLE');
  };

  const continueFromSelection = () => {
    if (!showtimeId) {
      toast.error('Chọn suất chiếu');
      return;
    }
    setSeatTab('seats');
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
    goToCheckout();
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
        promotionCode: promoDiscount > 0 && appliedPromo ? appliedPromo : undefined,
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
  const branchLabel = !isAdmin
    ? branchOptions[0]?.name
    : branchOptions.find((branch) => branch.id === branchFilter)?.name;
  const selectedSeatCodes = selectedSeatTickets.map((ticket) => ticket.seatCode || `${ticket.rowLabel || ''}${ticket.seatNumber || ''}`);
  const matchedCustomer = customerLookup?.status === 'found' && confirmedCustomerId === customerLookup.data.customerId
    ? customerLookup.data
    : null;
  const customerLabel = matchedCustomer
    ? [matchedCustomer.maskedName || 'Khách hàng', matchedCustomer.membershipTier && `Hạng ${matchedCustomer.membershipTier}`].filter(Boolean).join(' · ')
    : customer.customerName.trim() || 'Khách vãng lai';
  const submitLabel = submitting ? 'Đang xử lý…'
    : paymentMethod === 'CASH' ? `Thu ${formatCurrency(finalPrice)} & xuất vé` : `Tạo mã QR · ${formatCurrency(finalPrice)}`;
  const retryTickets = () => {
    setTicketError('');
    setLoadingTickets(true);
    setTicketAttempt((attempt) => attempt + 1);
  };

  return (
    <form onSubmit={(event) => event.preventDefault()} className="counter-page">
      {!lastBooking && !vnpaySale && (
        <header className="counter-header">
          <div>
            <h1>Bán vé tại quầy</h1>
            <p>{[branchLabel, formatDate(new Date())].filter(Boolean).join(' · ')}</p>
          </div>
          <nav className="counter-steps" aria-label="Các bước bán vé">
            {stepItems.map((step, index) => {
              const isActive = step.key === currentStep;
              const isDone = index < activeIndex;
              const disabled =
                (step.key === 'SEATS' && !showtimeId) ||
                (step.key === 'CHECKOUT' && (!showtimeId || selectedSeats.length === 0));
              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={disabled || submitting}
                  aria-current={isActive ? 'step' : undefined}
                  className={'counter-step' + (isActive ? ' is-active' : '') + (isDone ? ' is-done' : '')}
                  onClick={() => handleStepNavigation(step.key)}
                >
                  <span className="counter-step-dot" aria-hidden="true">
                    {isDone ? <CheckIcon size={12} strokeWidth={3.5} /> : index + 1}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </nav>
        </header>
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
        <div className="counter-workspace">
          <div className="counter-main">
            {currentStep === 'SELECTION' && (
              <StaffShowtimeStep
                branchFilter={branchFilter}
                branchOptions={branchOptions}
                clearFilters={clearFilters}
                dateFilter={dateFilter}
                filteredShowtimes={filteredShowtimes}
                handleBranchFilterChange={handleBranchFilterChange}
                handleSelectShowtime={handleSelectShowtime}
                hasActiveFilters={hasActiveFilters}
                isShowtimeAvailable={isShowtimeAvailable}
                movieGroups={movieGroups}
                quickDates={quickDates}
                searchQuery={searchQuery}
                setDateFilter={setDateFilter}
                setSearchQuery={setSearchQuery}
                setStatusFilter={setStatusFilter}
                setTimeFilter={setTimeFilter}
                showBranchFilter={isAdmin && branchOptions.length > 1}
                showtimeId={showtimeId}
                soonShowtimes={soonShowtimes}
                statusFilter={statusFilter}
                timeFilter={timeFilter}
              />
            )}

            {currentStep === 'SEATS' && (
              <StaffSeatStep
                addonsProps={{
                  foodError,
                  foodQuantity,
                  foods,
                  selectedFoods,
                  setSelectedFoods,
                  submitting,
                  updateFoodQuantity,
                }}
                foodQuantity={foodQuantity}
                getSeatClass={getSeatClass}
                loadingTickets={loadingTickets}
                onChangeShowtime={() => setCurrentStep('SELECTION')}
                onQuickPick={applyQuickPick}
                onRetryTickets={retryTickets}
                onSwitchShowtime={(showtime) => setShowtimeId(String(showtime.showtimeId))}
                quickCount={quickCount}
                seatMapStats={seatMapStats}
                seatPrices={seatPrices}
                seatTab={seatTab}
                selectedSeats={selectedSeats}
                selectedShowtime={selectedShowtime}
                setQuickCount={setQuickCount}
                setSeatTab={setSeatTab}
                setSelectedSeats={setSelectedSeats}
                showtimeId={showtimeId}
                siblingShowtimes={siblingShowtimes}
                sortedRows={sortedRows}
                ticketError={ticketError}
                toggleSeat={toggleSeat}
              />
            )}

            {currentStep === 'CHECKOUT' && (
              <StaffCheckoutStep
                cashChange={cashChange}
                cashReceived={cashReceived}
                confirmedCustomerId={confirmedCustomerId}
                customer={customer}
                customerLookup={customerLookup}
                onConfirmCustomer={setConfirmedCustomerId}
                onLookupCustomer={() => lookupCustomer(customer)}
                paymentMethod={paymentMethod}
                selectedSeatCodes={selectedSeatCodes}
                setCashReceived={setCashReceived}
                setCustomer={updateCustomer}
                setPaymentMethod={setPaymentMethod}
              />
            )}
          </div>

          <StaffReceiptSidebar
            canContinueSeats={canContinueSeats}
            canContinueSelection={canContinueSelection}
            cashChange={cashChange}
            cashReceived={cashReceived}
            continueFromSeats={continueFromSeats}
            continueFromSelection={continueFromSelection}
            currentStep={currentStep}
            customerLabel={customerLabel}
            finalPrice={finalPrice}
            foodQuantity={foodQuantity}
            foodTotal={foodTotal}
            handleResetOrder={handleResetOrder}
            handleSubmit={handleSubmit}
            onChangeShowtime={() => setCurrentStep('SELECTION')}
            onEditOrder={() => setCurrentStep('SEATS')}
            paymentMethod={paymentMethod}
            posterUrl={posterUrl}
            promo={{
              appliedPromo,
              availablePromos,
              loadingPromos,
              onApply: handleValidatePromo,
              onClear: clearPromo,
              promoCode,
              promoDiscount,
              promoError,
              setPromoCode,
              validatingPromo,
            }}
            seatGroups={seatGroups}
            seatTotal={seatTotal}
            selectedFoodItems={selectedFoodItems}
            selectedSeatTickets={selectedSeatTickets}
            selectedSeats={selectedSeats}
            selectedShowtime={selectedShowtime}
            showtimeId={showtimeId}
            submitting={submitting}
            toggleSeat={toggleSeat}
          />
        </div>
      )}

      {/* Thanh dưới cùng trên màn hẹp, thay cho nút ở chân phiếu bán vé */}
      {!lastBooking && !vnpaySale && (
        <div className="counter-mobile-bar">
          <span><strong>{selectedSeats.length}</strong> ghế</span>
          {foodQuantity > 0 && <span><strong>{foodQuantity}</strong> món</span>}
          <span className="counter-mobile-total">{formatCurrency(finalPrice)}</span>
          {currentStep === 'CHECKOUT' ? (
            <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={currentStep === 'SELECTION' ? !canContinueSelection : !canContinueSeats}
              onClick={currentStep === 'SELECTION' ? continueFromSelection : continueFromSeats}
            >
              {currentStep === 'SELECTION' ? 'Chọn ghế' : 'Sang thu tiền'}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
