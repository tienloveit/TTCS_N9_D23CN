import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { bookingApi, foodApi, ticketApi } from '../../api';
import { API_BASE_URL } from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

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

  const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;

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
      navigate('/login');
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
          <div className="booking-bar">
            <span>
              <strong>{selectedSeats.length}</strong> ghế
            </span>
            {foodQuantity > 0 && (
              <span>
                <strong>{foodQuantity}</strong> món
              </span>
            )}
            <span className="booking-bar-total">{formatCurrency(totalPrice)}</span>
            <button className="btn btn-primary" onClick={handleBooking} disabled={booking}>
              {booking ? 'Đang xử lý...' : 'Đặt vé'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
