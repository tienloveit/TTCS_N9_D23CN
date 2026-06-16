import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { bookingApi, foodApi, ticketApi, promotionApi, showtimeApi, movieApi } from '../../api';
import { API_BASE_URL } from '../../api/axiosClient';
import { useAuth } from '../../context/useAuth';
import SafeImage from '../../components/Common/SafeImage';
import { ClockIcon } from '../../components/Common/CinemaIcons';

export default function SeatSelectPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [foods, setFoods] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState({});
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [foodError, setFoodError] = useState('');
  const stompClient = useRef(null);

  // New state for showtime info, movie info, sibling showtimes
  const [showtimeInfo, setShowtimeInfo] = useState(null);
  const [movieInfo, setMovieInfo] = useState(null);
  const [siblingShowtimes, setSiblingShowtimes] = useState([]);
  const [bookingStep, setBookingStep] = useState(1); // 1 = SEAT, 2 = FOOD

  // Fetch showtime info → then movie info + sibling showtimes
  useEffect(() => {
    let mounted = true;

    showtimeApi.getById(showtimeId).then((res) => {
      if (!mounted) return;
      const st = res.data.result;
      setShowtimeInfo(st);

      // Fetch movie info
      if (st.movieId) {
        movieApi.getById(st.movieId).then((mRes) => {
          if (mounted) setMovieInfo(mRes.data.result);
        }).catch(() => {});

        // Fetch sibling showtimes (same movie)
        showtimeApi.getByMovie(st.movieId).then((sRes) => {
          if (!mounted) return;
          const all = sRes.data.result || [];
          // Filter: same branch, same date, status OPEN/SCHEDULED
          const stDate = st.startTime?.substring(0, 10);
          const filtered = all
            .filter((s) =>
              s.branchId === st.branchId &&
              s.startTime?.substring(0, 10) === stDate &&
              (s.status === 'OPEN' || s.status === 'SCHEDULED')
            )
            .sort((a, b) => a.startTime?.localeCompare(b.startTime));
          setSiblingShowtimes(filtered);
        }).catch(() => {});
      }
    }).catch(() => {});

    return () => { mounted = false; };
  }, [showtimeId]);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError('');
    setFoodError('');

    Promise.allSettled([ticketApi.getByShowtimeId(showtimeId), foodApi.getAll()])
      .then(([ticketResult, foodResult]) => {
        if (!mounted) return;

        if (ticketResult.status === 'fulfilled') {
          setTickets(ticketResult.value.data.result || []);
        } else {
          setError('Không thể tải sơ đồ ghế');
        }

        if (foodResult.status === 'fulfilled') {
          setFoods(foodResult.value.data.result || []);
        } else {
          setFoodError('Không thể tải menu đồ ăn');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [showtimeId]);

  useEffect(() => {
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
      client.deactivate();
    };
  }, [showtimeId]);

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
        .map((food) => ({
          ...food,
          quantity: selectedFoods[food.id] || 0,
        }))
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
  const totalPrice = seatTotal + foodTotal;
  const finalPrice = totalPrice;

  const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;

  // Format time from ISO string
  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${weekdays[d.getDay()]}, ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  const toggleSeat = (ticket) => {
    const status = ticket.displayStatus || ticket.ticketStatus;
    if (status === 'BOOKED' || status === 'HOLDING') return;

    setSelectedSeats((prev) => {
      if (prev.includes(ticket.seatId)) {
        return prev.filter((id) => id !== ticket.seatId);
      }
      return [...prev, ticket.seatId];
    });
  };

  const updateFoodQuantity = (foodId, delta) => {
    setSelectedFoods((prev) => {
      const currentQuantity = prev[foodId] || 0;
      const nextQuantity = Math.max(0, currentQuantity + delta);
      const nextSelectedFoods = { ...prev };

      if (nextQuantity === 0) {
        delete nextSelectedFoods[foodId];
      } else {
        nextSelectedFoods[foodId] = nextQuantity;
      }

      return nextSelectedFoods;
    });
  };

  const getSeatClass = (ticket) => {
    const status = ticket.displayStatus || ticket.ticketStatus;
    if (selectedSeats.includes(ticket.seatId)) return 'seat seat--selected';
    if (status === 'BOOKED') return 'seat seat--booked';
    if (status === 'HOLDING') return 'seat seat--holding';
    return 'seat seat--available';
  };

  const handleSwitchShowtime = (newShowtimeId) => {
    if (String(newShowtimeId) === String(showtimeId)) return;
    // Reset selections when switching
    setSelectedSeats([]);
    setSelectedFoods({});
    navigate(`/showtime/${newShowtimeId}/seats`, { replace: true });
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/showtime/${showtimeId}/seats` } });
      return;
    }

    if (selectedSeats.length === 0) return;

    setBooking(true);
    setError('');

    try {
      const res = await bookingApi.create({
        showtimeId,
        seatIds: selectedSeats,
        foods: selectedFoodItems.map((food) => ({
          foodId: food.id,
          quantity: food.quantity,
        })),
      });
      const bookingData = res.data.result;
      navigate(`/booking/${bookingData.bookingId}/payment`);
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || '';
      // Showtime đã bị xóa hoặc đã đóng → quay lại chọn suất
      if (code === 1012 || msg.toLowerCase().includes('showtime')) {
        alert('Suất chiếu này không còn khả dụng. Vui lòng chọn suất chiếu khác.');
        navigate(-1);
      } else {
        setError(msg || 'Đặt vé thất bại. Vui lòng thử lại.');
      }
    } finally {
      setBooking(false);
    }

  };

  // Selected seat objects for sidebar display
  const selectedTicketObjects = useMemo(
    () => tickets.filter((t) => selectedSeats.includes(t.seatId)),
    [tickets, selectedSeats]
  );

  // Group selected seats by seat type for display
  const seatGroups = useMemo(() => {
    const groups = {};
    selectedTicketObjects.forEach((t) => {
      const type = t.seatType || 'Ghế thường';
      if (!groups[type]) groups[type] = { seats: [], price: Number(t.price || 0) };
      groups[type].seats.push(t.seatCode || `${t.rowLabel || '?'}${t.seatNumber || ''}`);
    });
    return Object.entries(groups);
  }, [selectedTicketObjects]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  // Build subtitle line: "2D Phụ Đề - T18" etc.
  const subtitleParts = [];
  if (movieInfo?.language) subtitleParts.push(movieInfo.language === 'Tiếng Việt' ? '2D' : '2D Phụ Đề');
  if (movieInfo?.ageRating) subtitleParts.push(movieInfo.ageRating);

  // Steps definition
  const steps = [
    { label: 'Chọn phim / Rạp / Suất', done: true },
    { label: 'Chọn ghế', active: bookingStep === 1, done: bookingStep > 1 },
    { label: 'Chọn thức ăn', active: bookingStep === 2, done: bookingStep > 2 },
    { label: 'Thanh toán' },
    { label: 'Xác nhận' },
  ];

  return (
    <div className="page">
      <div className="container">
        {/* Booking Steps */}
        <div className="booking-steps">
          {steps.map((step, i) => (
            <div key={i} className={`booking-step ${step.active ? 'booking-step--active' : ''} ${step.done ? 'booking-step--done' : ''}`}>
              <div className="booking-step-dot">{step.done ? '✓' : i + 1}</div>
              <span className="booking-step-label">{step.label}</span>
              {i < steps.length - 1 && <div className="booking-step-line" />}
            </div>
          ))}
        </div>

        <div className="seat-page-layout">
          {/* ===== LEFT: Main Content ===== */}
          <div className="seat-page-main">
            {error && (
              <div className="error-message" style={{ marginBottom: 20 }}>
                {error}
              </div>
            )}

            {bookingStep === 1 && (
              <>
                {/* Showtime Switcher */}
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
                      onClick={() => handleSwitchShowtime(st.showtimeId)}
                    >
                      {formatTime(st.startTime)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Seat Map */}
            <div className="card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
                <div className="seat-screen" />
              </div>

              <div className="seat-map-wrapper">
                <div className="seat-map">
                  {sortedRows.map(([row, seats]) => (
                    <div key={row} className="seat-row">
                      <span className="seat-row-label">{row}</span>
                      {seats.map((ticket) => {
                        const seatLabel = ticket.seatCode || `${row}${ticket.seatNumber || ''}`;

                        return (
                          <div
                            key={ticket.ticketId}
                            className={getSeatClass(ticket)}
                            onClick={() => toggleSeat(ticket)}
                            title={`${seatLabel} - ${ticket.displayStatus || ticket.ticketStatus}`}
                          >
                            {ticket.seatNumber || ''}
                          </div>
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
                  Trống
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
                  Đang giữ
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
            </div>
          </>
        )}

            {bookingStep === 2 && (
              <>
                {/* Food Selection */}
            {(foods.length > 0 || foodError) && (
              <div className="card food-select-card">
                <div className="food-select-header">
                  <div>
                    <h2>Chọn đồ ăn</h2>
                    <p>Bắp nước và combo có thể thêm vào cùng đơn đặt vé.</p>
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
                            disabled={quantity === 0 || booking}
                            aria-label={`Giảm ${food.name}`}
                          >
                            -
                          </button>
                          <span>{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateFoodQuantity(food.id, 1)}
                            disabled={booking}
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
          </>
        )}
      </div>

          {/* ===== RIGHT: Sidebar ===== */}
          <aside className="seat-sidebar">
            <div className="seat-sidebar-card">
              {/* Poster + Movie Info */}
              <div className="seat-sidebar-header">
                {movieInfo?.thumbnailUrl && (
                  <SafeImage
                    src={movieInfo.thumbnailUrl}
                    alt={movieInfo.movieName}
                    className="seat-sidebar-poster"
                  />
                )}
                <div className="seat-sidebar-info">
                  <h3 className="seat-sidebar-title">{showtimeInfo?.movieName || 'Đang tải...'}</h3>
                  {subtitleParts.length > 0 && (
                    <div className="seat-sidebar-subtitle">
                      {subtitleParts.map((part, i) => (
                        <span key={i}>
                          {i > 0 && ' - '}
                          {part === movieInfo?.ageRating ? (
                            <span className="seat-sidebar-age-badge">{part}</span>
                          ) : (
                            part
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cinema + Showtime line */}
              <div className="seat-sidebar-cinema">
                {showtimeInfo?.branchName && (
                  <div className="seat-sidebar-cinema-name">
                    {showtimeInfo.branchName}{showtimeInfo.roomName ? ` - ${showtimeInfo.roomName}` : ''}
                  </div>
                )}
                {showtimeInfo?.startTime && (
                  <div className="seat-sidebar-cinema-time">
                    Suất <strong>{formatTime(showtimeInfo.startTime)}</strong> - {formatDate(showtimeInfo.startTime)}
                  </div>
                )}
              </div>

              {/* Ticket Items (separated by divider) */}
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

              {/* Food Items (separated by divider) */}
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

              {/* Total */}
              <div className="seat-sidebar-total">
                <span>Tổng cộng</span>
                <strong>{formatCurrency(finalPrice)}</strong>
              </div>

              {/* Actions */}
              <div className="seat-sidebar-actions">
                <button
                  type="button"
                  className="btn btn-secondary seat-sidebar-btn"
                  onClick={() => bookingStep === 2 ? setBookingStep(1) : navigate(-1)}
                >
                  Quay lại
                </button>
                {bookingStep === 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary seat-sidebar-btn"
                    onClick={() => setBookingStep(2)}
                    disabled={selectedSeats.length === 0}
                  >
                    Tiếp tục
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary seat-sidebar-btn"
                    onClick={handleBooking}
                    disabled={booking || selectedSeats.length === 0}
                  >
                    {booking ? 'Đang xử lý...' : 'Thanh toán'}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile booking bar (shown on small screens) */}
      {selectedSeats.length > 0 && (
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
          {bookingStep === 1 ? (
            <button className="btn btn-primary" onClick={() => setBookingStep(2)}>Tiếp tục</button>
          ) : (
            <button className="btn btn-primary" onClick={handleBooking} disabled={booking}>
              {booking ? 'Đang xử lý...' : 'Thanh toán'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
