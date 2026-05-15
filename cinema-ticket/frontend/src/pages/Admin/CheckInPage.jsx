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
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn file ảnh');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) {
      toast.error('Nhập mã vé hoặc quét QR');
      return;
    }

    setChecking(true);
    try {
      const res = await ticketApi.checkIn({ code: value });
      setResult(res.data.result);
      setCode('');
      toast.success('Check-in thành công');
    } catch (err) {
      setResult(null);
      toast.error(err.response?.data?.message || 'Check-in thất bại');
    } finally {
      setChecking(false);
    }
  };

  const handleImageSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      toast.error('Vui lòng chọn ảnh QR code');
      return;
    }

    setChecking(true);
    try {
      const res = await ticketApi.checkInByQRImage(selectedFile);
      setResult(res.data.result);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success('Check-in thành công');
    } catch (err) {
      setResult(null);
      toast.error(err.response?.data?.message || 'Check-in thất bại');
    } finally {
      setChecking(false);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Check-in vé</h1>
        <p className="page-subtitle">Quét QR hoặc nhập mã vé để xác nhận khách vào rạp.</p>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {/* Form nhập mã */}
        <form className="admin-table-card" style={{ padding: 24, display: 'grid', gap: 16 }} onSubmit={handleSubmit}>
          <h3 style={{ margin: 0 }}>Nhập mã QR</h3>
          <label>
            <span className="form-label">Mã QR / mã vé</span>
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
              {checking ? 'Đang check-in...' : 'Check-in'}
            </button>
          </div>
        </form>

        {/* Form upload ảnh */}
        <form className="admin-table-card" style={{ padding: 24, display: 'grid', gap: 16 }} onSubmit={handleImageSubmit}>
          <h3 style={{ margin: 0 }}>Tải ảnh QR code</h3>
          <label>
            <span className="form-label">Chọn ảnh QR code</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="input"
              style={{ padding: '8px' }}
            />
          </label>

          {previewUrl && (
            <div style={{ position: 'relative' }}>
              <img
                src={previewUrl}
                alt="QR Preview"
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: 'auto',
                  border: '2px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
              <button
                type="button"
                onClick={handleClearImage}
                className="btn"
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  padding: '4px 8px',
                  fontSize: '12px'
                }}
              >
                Xóa
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" disabled={checking || !selectedFile}>
              {checking ? 'Đang check-in...' : 'Check-in bằng ảnh'}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div className="admin-table-card" style={{ padding: 24, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: '0 0 8px' }}>{result.movieName || 'Vé xem phim'}</h2>
              <div style={{ color: 'var(--text-muted)' }}>
                {result.bookingCode} - {result.customerName || 'Khách hàng'}
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
                <th>Ghế</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {(result.tickets || []).map((ticket) => (
                <tr key={ticket.ticketId}>
                  <td style={{ fontFamily: 'monospace' }}>{ticket.ticketId}</td>
                  <td><span className="movie-badge">{ticket.seatCode}</span></td>
                  <td>
                    <span className={`status-badge ${ticket.alreadyCheckedIn ? 'status--pending' : 'status--active'}`}>
                      {ticket.alreadyCheckedIn ? 'Đã check-in trước đó' : 'Hợp lệ'}
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
