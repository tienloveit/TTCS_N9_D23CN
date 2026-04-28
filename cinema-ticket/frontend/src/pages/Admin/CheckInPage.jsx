import { useState } from 'react';
import { toast } from 'react-toastify';
import { ticketApi } from '../../api';

const formatShowtime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

export default function CheckInPage() {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) {
      toast.error('Nhap ma ve hoac quet QR');
      return;
    }

    setChecking(true);
    try {
      const res = await ticketApi.checkIn({ code: value });
      setResult(res.data.result);
      setCode('');
      toast.success('Check-in thanh cong');
    } catch (err) {
      setResult(null);
      toast.error(err.response?.data?.message || 'Check-in that bai');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Check-in ve</h1>
        <p className="page-subtitle">Quet QR hoac nhap ma ve de xac nhan khach vao rap.</p>
      </div>

      <form className="admin-table-card" style={{ padding: 24, display: 'grid', gap: 16 }} onSubmit={handleSubmit}>
        <label>
          <span className="form-label">Ma QR / ma ve</span>
          <textarea
            className="input"
            rows="4"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CINEMAHUB|BOOKING=...|TICKET=...|SEAT=..."
            style={{ resize: 'vertical', minHeight: 110 }}
            autoFocus
          />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" disabled={checking}>
            {checking ? 'Dang check-in...' : 'Check-in'}
          </button>
        </div>
      </form>

      {result && (
        <div className="admin-table-card" style={{ padding: 24, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 8px' }}>{result.movieName || 'Ve xem phim'}</h2>
              <div style={{ color: 'var(--text-muted)' }}>
                {result.bookingCode} - {result.customerName || 'Khach hang'}
              </div>
            </div>
            <div style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
              <div>{formatShowtime(result.showtimeStart)}</div>
              <div>{result.branchName} - {result.roomName}</div>
            </div>
          </div>

          <table className="admin-table" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Ghe</th>
                <th>Trang thai</th>
                <th>Thoi gian</th>
              </tr>
            </thead>
            <tbody>
              {(result.tickets || []).map((ticket) => (
                <tr key={ticket.ticketId}>
                  <td style={{ fontFamily: 'monospace' }}>{ticket.ticketId}</td>
                  <td><span className="movie-badge">{ticket.seatCode}</span></td>
                  <td>
                    <span className={`status-badge ${ticket.alreadyCheckedIn ? 'status--pending' : 'status--active'}`}>
                      {ticket.alreadyCheckedIn ? 'Da check-in truoc do' : 'Hop le'}
                    </span>
                  </td>
                  <td>{formatShowtime(ticket.checkedInAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
