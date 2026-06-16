import { useRef, useState } from 'react';
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
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const codeInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const addRecentCheckIn = (ticketCode, status) => {
    const normalizedCode = ticketCode || 'QR_IMAGE';
    setRecentCheckIns((items) => [
      {
        id: `${Date.now()}-${normalizedCode}`,
        time: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        code: normalizedCode,
        status,
      },
      ...items,
    ].slice(0, 6));
  };

  const shortenCode = (value) =>
    value.length > 28 ? `${value.slice(0, 25)}...` : value;

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
    event.target.value = '';
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
      addRecentCheckIn(value, 'Thành công');
      toast.success('Check-in thành công');
    } catch (err) {
      setResult(null);
      addRecentCheckIn(value, 'Thất bại');
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
      addRecentCheckIn(selectedFile.name, 'Thành công');
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success('Check-in thành công');
    } catch (err) {
      setResult(null);
      addRecentCheckIn(selectedFile.name, 'Thất bại');
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
    <div className="checkin-page">
      <section className="checkin-card">
        <div className="checkin-actions">
          <button
            type="button"
            className="checkin-action"
            onClick={() => cameraInputRef.current?.click()}
          >
            <span className="checkin-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M4 7.5h3l1.4-2h7.2l1.4 2h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z" />
                <circle cx="12" cy="13.4" r="3.2" />
              </svg>
            </span>
            <strong>Sử dụng Camera để quét</strong>
          </button>

          <button
            type="button"
            className="checkin-action"
            onClick={() => uploadInputRef.current?.click()}
          >
            <span className="checkin-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img">
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 15v3.5A2.5 2.5 0 0 0 7.5 21h9A2.5 2.5 0 0 0 19 18.5V15" />
              </svg>
            </span>
            <strong>Tải ảnh mã QR</strong>
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="checkin-hidden-input"
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="checkin-hidden-input"
        />

        {previewUrl && (
          <form className="checkin-preview" onSubmit={handleImageSubmit}>
            <img src={previewUrl} alt="QR Preview" />
            <div>
              <strong>{selectedFile?.name}</strong>
              <span>Ảnh QR đã sẵn sàng để check-in.</span>
            </div>
            <button className="btn btn-primary" disabled={checking || !selectedFile}>
              {checking ? 'Đang check-in...' : 'Check-in bằng ảnh'}
            </button>
            <button type="button" className="btn" onClick={handleClearImage}>
              Xóa
            </button>
          </form>
        )}

        <form className="checkin-code-form" onSubmit={handleSubmit}>
          <label>
            <span className="form-label">Mã QR / mã vé</span>
            <textarea
              ref={codeInputRef}
              className="input"
              rows="2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Nhập hoặc dán mã vé tại đây..."
              autoFocus
            />
          </label>
          <button className="btn btn-primary" disabled={checking}>
            {checking ? 'Đang check-in...' : 'Check-in'}
          </button>
        </form>
      </section>

      <section className="checkin-history-card">
        <h2>Lịch sử check-in gần đây</h2>
        <div className="checkin-history-table">
          <div className="checkin-history-head">
            <span>Thời gian</span>
            <span>Mã vé</span>
            <span>Trạng thái</span>
          </div>
          {recentCheckIns.length === 0 ? (
            <div className="checkin-history-empty">
              Chưa có lượt check-in trong phiên này.
            </div>
          ) : (
            recentCheckIns.map((item) => (
              <div className="checkin-history-row" key={item.id}>
                <span>{item.time}</span>
                <span>{shortenCode(item.code)}</span>
                <span className={item.status === 'Thành công' ? 'checkin-status-success' : 'checkin-status-error'}>
                  {item.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {result && (
        <div className="admin-table-card checkin-result-card">
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
