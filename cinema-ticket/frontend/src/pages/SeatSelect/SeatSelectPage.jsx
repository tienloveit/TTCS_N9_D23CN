import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { bookingApi, foodApi, ticketApi, promotionApi } from '../../api';
import { API_BASE_URL } from '../../api/axiosClient';
import { useAuth } from '../../context/useAuth';

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
  const stompClient = useRef(null);

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
      setPromoDiscount(res.data.result.discountAmount);
      setPromoError('');
    } catch (err) {
      setPromoDiscount(0);
      setPromoError(err.response?.data?.message || 'Mã không hợp lệ');
    } finally {
      setValidatingPromo(false);
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
      setError(err.response?.data?.message || 'Đặt vé thất bại. Vui lòng thử lại.');
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

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Chọn ghế</h1>
          <p className="page-subtitle">Chọn ghế ngồi, thêm đồ ăn và tiến hành đặt vé</p>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

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

        {selectedSeats.length > 0 && (
          <>
            <div className="card" style={{ padding: '24px 32px', marginBottom: 120 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }}>
                  <h3 style={{ marginBottom: 12, fontSize: '1.1rem' }}>Mã khuyến mãi</h3>
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
                  {promoDiscount > 0 && (
                    <div style={{ color: 'var(--seat-available)', fontSize: '0.9rem', marginTop: 8, fontWeight: 600 }}>
                      Đã giảm: {formatCurrency(promoDiscount)}
                    </div>
                  )}
                </div>
                
                <div style={{ flex: '1 1 300px', background: 'var(--bg-secondary)', padding: 20, borderRadius: 'var(--radius-md)', minWidth: 280 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tạm tính:</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--seat-available)', fontWeight: 600 }}>
                      <span>Khuyến mãi:</span>
                      <span>-{formatCurrency(promoDiscount)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Tổng cộng:</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--gold)' }}>{formatCurrency(finalPrice)}</strong>
                  </div>
                </div>
              </div>
            </div>

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
              <button className="btn btn-primary" onClick={handleBooking} disabled={booking}>
                {booking ? 'Đang xử lý...' : 'Đặt vé'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
