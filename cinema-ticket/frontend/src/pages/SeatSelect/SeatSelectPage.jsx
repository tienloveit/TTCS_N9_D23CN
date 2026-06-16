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
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [showPromos, setShowPromos] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const stompClient = useRef(null);

  // New state for showtime info, movie info, sibling showtimes
  const [showtimeInfo, setShowtimeInfo] = useState(null);
  const [movieInfo, setMovieInfo] = useState(null);
  const [siblingShowtimes, setSiblingShowtimes] = useState([]);

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
  const finalPrice = Math.max(0, totalPrice - promoDiscount);

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

  // Reset promo discount if total price changes and becomes less than promo criteria
  useEffect(() => {
    if (promoDiscount > 0) {
      setPromoDiscount(0);
      setPromoError('Giỏ hàng thay đổi, vui lòng áp dụng lại mã (nếu có)');
    }
  }, [totalPrice]);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) {
      setPromoDiscount(0);
      setPromoError('');
      return;
    }
    if (totalPrice === 0) {
      setPromoError('Vui lòng chọn ghế trước khi áp dụng mã');
      return;
    }

    setValidatingPromo(true);
    setPromoError('');
    try {
      const res = await promotionApi.validate({
        code: promoCode,
        orderAmount: totalPrice,
      });
      setPromoDiscount(Number(res.data.result.discountAmount));
      setPromoError('');
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
    setPromoCode('');
    setPromoDiscount(0);
    setPromoError('');
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
        promotionCode: promoDiscount > 0 ? promoCode : undefined,
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

  return (
    <div className="page">
      <div className="container">
        <div className="seat-page-layout">
          {/* ===== LEFT: Main Content ===== */}
          <div className="seat-page-main">
            {error && (
              <div className="error-message" style={{ marginBottom: 20 }}>
                {error}
              </div>
            )}

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

            {/* Promo Code + Summary (shown when seats selected) */}
            {selectedSeats.length > 0 && (
              <div className="card" style={{ padding: '24px 32px', marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Mã khuyến mãi</h3>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleShowPromos} style={{ fontSize: '0.85rem' }}>
                        {showPromos ? 'Đóng' : 'Xem mã khả dụng'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Nhập mã giảm giá..."
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        style={{ textTransform: 'uppercase', maxWidth: 300 }}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={handleValidatePromo}
                        disabled={validatingPromo || !promoCode.trim()}
                      >
                        {validatingPromo ? 'Đang kiểm tra...' : 'Áp dụng'}
                      </button>
                    </div>
                    {promoError && (
                      <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 8 }}>{promoError}</div>
                    )}
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
                    {promoDiscount > 0 && (
                      <div style={{ color: 'var(--seat-available)', fontSize: '0.9rem', marginTop: 8, fontWeight: 600 }}>
                        Đã giảm: {formatCurrency(promoDiscount)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== RIGHT: Sidebar ===== */}
          <aside className="seat-sidebar">
            <div className="seat-sidebar-card">
              {/* Poster */}
              {movieInfo?.thumbnailUrl && (
                <SafeImage
                  src={movieInfo.thumbnailUrl}
                  alt={movieInfo.movieName}
                  className="seat-sidebar-poster"
                />
              )}

              {/* Movie Info */}
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

              {/* Cinema + Showtime Info */}
              <div className="seat-sidebar-details">
                {showtimeInfo?.branchName && (
                  <div className="seat-sidebar-detail-row">
                    <span className="seat-sidebar-detail-label">Rạp</span>
                    <span>{showtimeInfo.branchName}{showtimeInfo.roomName ? ` - ${showtimeInfo.roomName}` : ''}</span>
                  </div>
                )}
                {showtimeInfo?.startTime && (
                  <div className="seat-sidebar-detail-row">
                    <span className="seat-sidebar-detail-label">Suất</span>
                    <span>
                      <strong>{formatTime(showtimeInfo.startTime)}</strong>
                      {' - '}
                      {formatDate(showtimeInfo.startTime)}
                    </span>
                  </div>
                )}
                {selectedSeats.length > 0 && (
                  <div className="seat-sidebar-detail-row">
                    <span className="seat-sidebar-detail-label">Ghế</span>
                    <span>
                      {tickets
                        .filter((t) => selectedSeats.includes(t.seatId))
                        .map((t) => t.seatCode || `${t.rowLabel || '?'}${t.seatNumber || ''}`)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {foodQuantity > 0 && (
                  <div className="seat-sidebar-detail-row">
                    <span className="seat-sidebar-detail-label">Đồ ăn</span>
                    <span>{foodQuantity} món ({formatCurrency(foodTotal)})</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="seat-sidebar-divider" />

              {/* Total */}
              <div className="seat-sidebar-total">
                <span>Tổng cộng</span>
                <strong>{formatCurrency(finalPrice)}</strong>
              </div>

              {/* Promo info in sidebar */}
              {promoDiscount > 0 && (
                <div className="seat-sidebar-promo">
                  Khuyến mãi: -{formatCurrency(promoDiscount)}
                </div>
              )}

              {/* Actions */}
              <div className="seat-sidebar-actions">
                <button
                  type="button"
                  className="btn btn-secondary seat-sidebar-btn"
                  onClick={() => navigate(-1)}
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  className="btn btn-primary seat-sidebar-btn"
                  onClick={handleBooking}
                  disabled={booking || selectedSeats.length === 0}
                >
                  {booking ? 'Đang xử lý...' : 'Tiếp tục'}
                </button>
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
          <button className="btn btn-primary" onClick={handleBooking} disabled={booking}>
            {booking ? 'Đang xử lý...' : 'Đặt vé'}
          </button>
        </div>
      )}
    </div>
  );
}
