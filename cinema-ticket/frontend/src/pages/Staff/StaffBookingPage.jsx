import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { bookingApi, foodApi, showtimeApi, ticketApi } from '../../api';
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

export default function StaffBookingPage() {
  const navigate = useNavigate();
  const [showtimes, setShowtimes] = useState([]);
  const [foods, setFoods] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showtimeId, setShowtimeId] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('ALL');

  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState({});
  const [customer, setCustomer] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
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
          setError('Khong tai duoc danh sach suat chieu');
        }

        if (foodResult.status === 'fulfilled') {
          setFoods((foodResult.value.data.result || []).filter((food) => food.active !== false));
        } else {
          setFoodError('Khong tai duoc menu do an');
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
        if (mounted) setError('Khong tai duoc so do ghe');
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

    showtimes.forEach((showtime) => {
      const key = showtime.branchId == null ? showtime.branchName || 'UNKNOWN' : String(showtime.branchId);
      if (!branchMap.has(key)) {
        branchMap.set(key, {
          id: key,
          name: showtime.branchName || 'MoviePTIT chua xac dinh',
        });
      }
    });

    return [...branchMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [showtimes]);

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
          case 'ONGOING': { // Đang chiếu
            const endTime = showtime.endTime ? new Date(showtime.endTime) : null;
            return startTime <= now && (!endTime || endTime > now);
          }
          default:
            return true;
        }
      });
    }

    // Chỉ hiển thị suất có thể bán
    result = result.filter((showtime) => isShowtimeAvailable(showtime));

    // Filter by room type
    if (roomTypeFilter !== 'ALL') {
      result = result.filter((showtime) => {
        const roomType = (showtime.roomType || '').toUpperCase();
        return roomType.includes(roomTypeFilter);
      });
    }

    return result;
  }, [branchFilter, showtimes, searchQuery, dateFilter, timeFilter, roomTypeFilter]);

  const showtimeGroups = useMemo(() => {
    const grouped = filteredShowtimes.reduce((acc, showtime) => {
      const branch = showtime.branchName || 'Rap chua xac dinh';
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!showtimeId) {
      toast.error('Chon suat chieu');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Chon it nhat 1 ghe');
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

      const ticketRes = await ticketApi.getByShowtimeId(showtimeId);
      setTickets(ticketRes.data.result || []);
      toast.success('Dat ve tai quay thanh cong');
    } catch (err) {
      const message = err.response?.data?.message || 'Dat ve that bai';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header">
        <h1 className="page-title">Dat ve tai quay</h1>
        <p className="page-subtitle">
          Chon suat chieu hom nay, ghe, do an va hoan tat thanh toan truc tiep cho khach.
        </p>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div className="admin-table-card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="table-header" style={{ padding: 0, borderBottom: 0, marginBottom: 18, flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3>Suat chieu</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                {filteredShowtimes.length}/{showtimes.length} suat chieu duoc lay tu he thong
              </p>
            </div>
          </div>

          {/* Filter row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <label>
              <span className="form-label">Tim kiem</span>
              <input
                type="text"
                className="input"
                placeholder="Ten phim, rap, phong..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>

            <label>
              <span className="form-label">Ngay chieu</span>
              <input
                type="date"
                className="input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </label>

            <label>
              <span className="form-label">Rap</span>
              <select className="input" value={branchFilter} onChange={handleBranchFilterChange}>
                <option value="ALL">Tat ca rap</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="form-label">Khung gio</span>
              <select className="input" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                <option value="ALL">Tat ca</option>
                <option value="MORNING">Sang (6h-12h)</option>
                <option value="AFTERNOON">Chieu (12h-18h)</option>
                <option value="EVENING">Toi (18h-22h)</option>
                <option value="NIGHT">Khuya (22h-6h)</option>
                <option value="UPCOMING">Chua chieu</option>
                <option value="ONGOING">Dang chieu</option>
              </select>
            </label>



            <label>
              <span className="form-label">Loai phong</span>
              <select className="input" value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)}>
                <option value="ALL">Tat ca</option>
                {roomTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {/* Clear filters button */}
            {(searchQuery || dateFilter || branchFilter !== 'ALL' || timeFilter !== 'ALL' || roomTypeFilter !== 'ALL') && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setSearchQuery('');
                    setDateFilter('');
                    setBranchFilter('ALL');
                    setTimeFilter('ALL');
                    setRoomTypeFilter('ALL');
                  }}
                  style={{ width: '100%' }}
                >
                  Xoa bo loc
                </button>
              </div>
            )}
          </div>
        </div>

        {filteredShowtimes.length === 0 ? (
          <div className="empty-state">
            {searchQuery.trim() || dateFilter || branchFilter !== 'ALL' || timeFilter !== 'ALL' || roomTypeFilter !== 'ALL'
              ? 'Khong tim thay suat chieu nao phu hop voi bo loc'
              : 'Khong co suat chieu phu hop voi MoviePTIT da chon.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            {showtimeGroups.map((group) => (
              <section key={group.branchName}>
                <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>{group.branchName}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {group.items.map((showtime) => {
                    const available = isShowtimeAvailable(showtime);
                    const selected = String(showtime.showtimeId) === String(showtimeId);

                    return (
                      <button
                        key={showtime.showtimeId}
                        type="button"
                        onClick={() => available && setShowtimeId(String(showtime.showtimeId))}
                        disabled={!available}
                        className={`admin-table-card ${selected ? 'showtime-time-btn--active' : ''}`}
                        style={{
                          padding: 16,
                          textAlign: 'left',
                          cursor: available ? 'pointer' : 'not-allowed',
                          opacity: available ? 1 : 0.55,
                          borderColor: selected ? 'var(--accent)' : 'var(--border)',
                          background: selected ? 'var(--accent-glow)' : 'var(--bg-card)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{formatTime(showtime.startTime)}</strong>
                          <span className={`status-badge ${available ? 'status--active' : 'status--inactive'}`}>
                            {available ? 'Co the ban' : 'Khong ban'}
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
      </div>

      {selectedShowtime && (
        <>
          <div className="admin-table-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span className="form-label">Suat dang ban</span>
                <h2 style={{ margin: '4px 0 0', fontSize: 20 }}>{selectedShowtime.movieName}</h2>
                <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                  {selectedShowtime.branchName} - {selectedShowtime.roomName}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="form-label">Thoi gian</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
                  {formatDateTime(selectedShowtime.startTime)}
                </div>
              </div>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: 32, marginBottom: 20 }}>
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
                    Trong
                  </div>
                  <div className="seat-legend-item">
                    <div className="seat-legend-dot" style={{ background: 'rgba(59,130,246,0.3)', borderColor: 'var(--seat-selected)' }} />
                    Dang chon
                  </div>
                  <div className="seat-legend-item">
                    <div className="seat-legend-dot" style={{ background: 'rgba(245,158,11,0.15)', borderColor: 'var(--seat-holding)' }} />
                    Dang giu
                  </div>
                  <div className="seat-legend-item">
                    <div className="seat-legend-dot" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'var(--seat-booked)' }} />
                    Da dat
                  </div>
                </div>
              </>
            )}
          </div>

          {(foods.length > 0 || foodError) && (
            <div className="admin-table-card food-select-card" style={{ marginBottom: 20 }}>
              <div className="food-select-header">
                <div>
                  <h2>Chon do an</h2>
                  <p>Them bap nuoc va combo vao don tai quay.</p>
                </div>
                {foodTotal > 0 && <strong>{formatCurrency(foodTotal)}</strong>}
              </div>

              {foodError && (
                <div className="error-message" style={{ marginBottom: 16 }}>
                  {foodError}
                </div>
              )}

              <div className="food-select-grid">
                {foods.map((food) => {
                  const quantity = selectedFoods[food.id] || 0;

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
                      </div>

                      <div className="food-stepper">
                        <button
                          type="button"
                          onClick={() => updateFoodQuantity(food.id, -1)}
                          disabled={quantity === 0 || submitting}
                          aria-label={`Giam ${food.name}`}
                        >
                          -
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateFoodQuantity(food.id, 1)}
                          disabled={submitting}
                          aria-label={`Tang ${food.name}`}
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

          <div className="admin-table-card" style={{ padding: 20, marginBottom: selectedSeats.length > 0 ? 96 : 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <div>
                <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Thong tin khach</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  <input
                    className="input"
                    placeholder="Ho ten"
                    value={customer.customerName}
                    onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Email de gui ve"
                    value={customer.customerEmail}
                    onChange={(e) => setCustomer({ ...customer, customerEmail: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="So dien thoai"
                    value={customer.customerPhone}
                    onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Thanh toan tai quay</h2>
                <select
                  className="input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Tien mat</option>
                  <option value="CARD">The</option>
                </select>
                <div style={{ marginTop: 16 }}>
                  <span className="form-label">Tong tien</span>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', marginTop: 6 }}>
                    {formatCurrency(total)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {lastBooking && (
        <div className="admin-table-card" style={{ padding: 24, marginBottom: 20 }}>
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
          
          <div style={{ marginTop: 32, textAlign: 'center' }}>
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
            <strong>{selectedSeats.length}</strong> ghe
          </span>
          {foodQuantity > 0 && (
            <span>
              <strong>{foodQuantity}</strong> mon
            </span>
          )}
          <span className="booking-bar-total">{formatCurrency(total)}</span>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Dang xu ly...' : 'Hoan tat tai quay'}
          </button>
        </div>
      )}
    </form>
  );
}
