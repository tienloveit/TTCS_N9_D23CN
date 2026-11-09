import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { bookingApi, ticketApi } from '../../api';
import {
  AlertTriangleIcon,
  ArmchairIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  ImageFileIcon,
  MapPinIcon,
  RefreshIcon,
  SearchIcon,
  SparkIcon,
  TicketIcon,
  UploadIcon,
  XCircleIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const formatShowtime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

const formatTimeOnly = (value) =>
  value
    ? new Date(value).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

export default function CheckInPage() {
  const [activeTab, setActiveTab] = useState('SCANNER'); // 'SCANNER' | 'IMAGE' | 'LOOKUP'
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  // Verdict state: { type: 'VALID' | 'WARNING' | 'ERROR', data?: TicketCheckInResponse, errorMsg?: string, scannedCode?: string }
  const [verdict, setVerdict] = useState(null);

  // Image upload / Drag & drop
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging, setDragging] = useState(false);

  // Live WebRTC Camera (with BarcodeDetector when supported + frame capture fallback)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Quick Booking Lookup
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupFilter, setLookupFilter] = useState('TODAY'); // 'TODAY' | 'ALL'

  // Session History & Counters
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ALL'); // 'ALL' | 'SUCCESS' | 'DUPLICATE' | 'ERROR'

  const codeInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera on unmount or tab switch
  const stopCamera = () => {
    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Load bookings when switching to LOOKUP tab
  const fetchBookingsForLookup = async () => {
    setLoadingBookings(true);
    try {
      const res = await bookingApi.getAll();
      const all = (res.data.result || []).filter(
        (b) => b.status === 'COMPLETED' && b.paymentStatus === 'PAID'
      );
      all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setBookings(all);
    } catch {
      toast.error('Không tải được danh sách đơn đặt vé');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'LOOKUP' && bookings.length === 0) {
      fetchBookingsForLookup();
    }
    if (activeTab !== 'SCANNER') {
      stopCamera();
    } else {
      setTimeout(() => codeInputRef.current?.focus(), 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const recordHistory = (entry) => {
    setRecentCheckIns((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        ...entry,
      },
      ...prev,
    ].slice(0, 30));
  };

  const evaluateCheckInResult = (data, rawCodeLabel) => {
    const tickets = data?.tickets || [];
    const newlyCheckedIn = tickets.filter((t) => !t.alreadyCheckedIn).length;
    const alreadyCount = tickets.filter((t) => t.alreadyCheckedIn).length;

    const allAlready = tickets.length > 0 && newlyCheckedIn === 0;
    const partialAlready = newlyCheckedIn > 0 && alreadyCount > 0;
    const verdictType = allAlready || partialAlready ? 'WARNING' : 'VALID';

    setVerdict({
      type: verdictType,
      data,
      newlyCheckedIn,
      alreadyCount,
      scannedCode: rawCodeLabel,
    });

    recordHistory({
      code: data.bookingCode || rawCodeLabel,
      movieName: data.movieName || 'Vé xem phim',
      seats: tickets.map((t) => t.seatCode).filter(Boolean).join(', '),
      roomName: data.roomName || '',
      status: allAlready ? 'DUPLICATE' : 'SUCCESS',
      statusLabel: allAlready
        ? 'Đã soát trước đó'
        : partialAlready
        ? `Hợp lệ (${newlyCheckedIn} mới, ${alreadyCount} cũ)`
        : `Hợp lệ (${tickets.length} ghế)`,
      rawResponse: data,
    });

    if (allAlready) {
      toast.warning('Vé này đã được check-in trước đó!');
    } else {
      toast.success(`Check-in thành công ${newlyCheckedIn} vé!`);
    }
  };

  const performCodeCheckIn = async (rawCode) => {
    const trimmed = String(rawCode || '').trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập mã vé, mã đơn hoặc quét QR');
      return;
    }

    setChecking(true);
    try {
      const res = await ticketApi.checkIn({ code: trimmed });
      const data = res.data.result;
      evaluateCheckInResult(data, trimmed);
      setCode('');
      // Refresh lookup list if already loaded
      if (bookings.length > 0) {
        fetchBookingsForLookup();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Mã vé không hợp lệ hoặc không thuộc chi nhánh';
      setVerdict({
        type: 'ERROR',
        errorMsg: msg,
        scannedCode: trimmed,
      });
      recordHistory({
        code: trimmed,
        movieName: msg,
        seats: '',
        roomName: '',
        status: 'ERROR',
        statusLabel: 'Từ chối',
      });
      toast.error(msg);
    } finally {
      setChecking(false);
      setTimeout(() => codeInputRef.current?.focus(), 60);
    }
  };

  const handleSubmitCode = async (event) => {
    event.preventDefault();
    await performCodeCheckIn(code);
  };

  // Start Live Camera
  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ mở Camera trực tiếp.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      // Use native BarcodeDetector if available in Chromium/Edge/Android
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        scanLoopRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = barcodes[0].rawValue;
              stopCamera();
              performCodeCheckIn(detected);
            }
          } catch {
            // ignore frame error
          }
        }, 450);
      }
    } catch {
      setCameraError('Không thể cấp quyền truy cập Camera. Bạn có thể chụp/tải ảnh QR lên.');
    }
  };

  // Capture current video frame & send to backend QR decoder
  const captureCameraFrameAndCheckIn = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
      stopCamera();
      await checkInWithFile(file);
    }, 'image/png');
  };

  const applySelectedFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn định dạng file ảnh (PNG, JPG, WEBP...)');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) applySelectedFile(file);
    event.target.value = '';
  };

  const checkInWithFile = async (fileToUse) => {
    const targetFile = fileToUse || selectedFile;
    if (!targetFile) {
      toast.error('Vui lòng chọn ảnh QR code');
      return;
    }

    setChecking(true);
    try {
      const res = await ticketApi.checkInByQRImage(targetFile);
      const data = res.data.result;
      evaluateCheckInResult(data, targetFile.name);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Không đọc được mã QR từ ảnh này';
      setVerdict({
        type: 'ERROR',
        errorMsg: msg,
        scannedCode: targetFile.name,
      });
      recordHistory({
        code: targetFile.name,
        movieName: msg,
        seats: '',
        roomName: '',
        status: 'ERROR',
        statusLabel: 'Lỗi ảnh QR',
      });
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  const handleImageSubmit = async (event) => {
    event.preventDefault();
    await checkInWithFile(selectedFile);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Filtered bookings for Lookup tab
  const filteredLookupBookings = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return bookings.filter((b) => {
      if (lookupFilter === 'TODAY' && b.showtimeStart) {
        const showDate = new Date(b.showtimeStart).toLocaleDateString('en-CA');
        if (showDate !== todayStr) return false;
      }
      if (!lookupQuery.trim()) return true;
      const q = lookupQuery.toLowerCase().trim();
      const matchCode = (b.bookingCode || '').toLowerCase().includes(q);
      const matchUser = (b.username || '').toLowerCase().includes(q);
      const matchMovie = (b.movieName || '').toLowerCase().includes(q);
      const matchSeats = (b.seatCodes || []).join(' ').toLowerCase().includes(q);
      return matchCode || matchUser || matchMovie || matchSeats;
    });
  }, [bookings, lookupQuery, lookupFilter]);

  // Session counters
  const stats = useMemo(() => {
    const valid = recentCheckIns.filter((i) => i.status === 'SUCCESS').length;
    const duplicate = recentCheckIns.filter((i) => i.status === 'DUPLICATE').length;
    const failed = recentCheckIns.filter((i) => i.status === 'ERROR').length;
    return { total: recentCheckIns.length, valid, duplicate, failed };
  }, [recentCheckIns]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'ALL') return recentCheckIns;
    return recentCheckIns.filter((item) => item.status === historyFilter);
  }, [recentCheckIns, historyFilter]);

  return (
    <div className="gate-page">
      {/* ===== TOP GATE CONTROL BAR ===== */}
      <div className="gate-top-bar">
        <div className="pos-top-bar-left">
          <span className="pos-badge-live">
            <span className="pos-badge-live-dot" />
            Gate Control
          </span>
          <div className="pos-top-title">
            <h1>Cổng kiểm soát & Check-in vé</h1>
            <p>Quét mã QR, nhập mã vé/mã đơn hoặc tra cứu danh sách khách vào phòng chiếu</p>
          </div>
        </div>

        <div className="gate-stats-row">
          <div className="gate-stat-chip">
            <span className="gate-stat-chip-dot" style={{ background: '#0756a6' }} />
            <div>
              <small>Lượt quét ca này</small>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="gate-stat-chip">
            <span className="gate-stat-chip-dot" style={{ background: '#16a34a' }} />
            <div>
              <small>Hợp lệ</small>
              <strong style={{ color: '#16a34a' }}>{stats.valid}</strong>
            </div>
          </div>

          <div className="gate-stat-chip">
            <span className="gate-stat-chip-dot" style={{ background: '#f59e0b' }} />
            <div>
              <small>Đã quét trùng</small>
              <strong style={{ color: '#d97706' }}>{stats.duplicate}</strong>
            </div>
          </div>

          <div className="gate-stat-chip">
            <span className="gate-stat-chip-dot" style={{ background: '#dc2626' }} />
            <div>
              <small>Từ chối / Lỗi</small>
              <strong style={{ color: '#dc2626' }}>{stats.failed}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 2-COLUMN GATE WORKSPACE ===== */}
      <div className="gate-workspace">
        {/* ===== LEFT COLUMN: SCANNER & INPUT METHODS ===== */}
        <div className="gate-col">
          <section className="gate-card">
            {/* Mode Switcher Tabs */}
            <div className="gate-mode-tabs">
              <button
                type="button"
                className={`gate-mode-tab ${activeTab === 'SCANNER' ? 'gate-mode-tab--active' : ''}`}
                onClick={() => setActiveTab('SCANNER')}
              >
                <TicketIcon />
                <span>Máy quét / Mã vé</span>
              </button>

              <button
                type="button"
                className={`gate-mode-tab ${activeTab === 'IMAGE' ? 'gate-mode-tab--active' : ''}`}
                onClick={() => setActiveTab('IMAGE')}
              >
                <ImageFileIcon size={18} />
                <span>Ảnh QR / Camera</span>
              </button>

              <button
                type="button"
                className={`gate-mode-tab ${activeTab === 'LOOKUP' ? 'gate-mode-tab--active' : ''}`}
                onClick={() => setActiveTab('LOOKUP')}
              >
                <SearchIcon size={18} />
                <span>Tra cứu đơn vé</span>
              </button>
            </div>

            {/* TAB 1: BARCODE / QR SCANNER & MANUAL CODE */}
            {activeTab === 'SCANNER' && (
              <div className="gate-scanner-box">
                <div className="gate-scanner-hint">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <SparkIcon size={16} />
                    <span>
                      Hỗ trợ súng bắn mã vạch/QR (tự động Enter) hoặc nhập trực tiếp{' '}
                      <strong>Mã đơn (BK...)</strong>, <strong>Mã QR</strong>, <strong>ID vé</strong>.
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                    onClick={() => (cameraActive ? stopCamera() : startCamera())}
                  >
                    {cameraActive ? (
                      <>
                        <XIcon size={15} />
                        <span>Tắt Camera</span>
                      </>
                    ) : (
                      <>
                        <CameraIcon size={15} />
                        <span>Bật Camera trực tiếp</span>
                      </>
                    )}
                  </button>
                </div>

                {cameraError && <div className="error-message">{cameraError}</div>}

                {cameraActive && (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div className="gate-camera-stage">
                      <video ref={videoRef} className="gate-camera-video" playsInline muted />
                      <div className="gate-camera-overlay">
                        <div className="gate-camera-frame">
                          <div className="gate-camera-laser" />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Đưa mã QR của khách vào khung ngắm hoặc bấm chụp để giải mã:
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                        onClick={captureCameraFrameAndCheckIn}
                        disabled={checking}
                      >
                        <CameraIcon size={16} />
                        <span>Chụp & Check-in ngay</span>
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitCode}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      color: '#475569',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    Nhập mã vé / Mã đặt chỗ (Booking Code)
                  </label>
                  <div className="gate-input-wrap">
                    <input
                      ref={codeInputRef}
                      type="text"
                      className="gate-code-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="VD: BK-2026... hoặc TICKET=123..."
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn gate-code-submit"
                      disabled={checking || !code.trim()}
                    >
                      {checking ? 'Đang soát...' : 'Soát vé ↵'}
                    </button>
                  </div>
                </form>

                {code && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setCode('');
                        codeInputRef.current?.focus();
                      }}
                    >
                      Xóa ô nhập
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: UPLOAD / DRAG & DROP QR IMAGE */}
            {activeTab === 'IMAGE' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="checkin-hidden-input"
                />

                {!previewUrl ? (
                  <div
                    className={`gate-dropzone ${dragging ? 'gate-dropzone--drag' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) applySelectedFile(file);
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'rgba(7, 86, 166, 0.1)',
                        color: 'var(--blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UploadIcon size={28} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>
                        Nhấn để chọn ảnh QR hoặc kéo thả ảnh vào đây
                      </strong>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Hỗ trợ ảnh chụp màn hình vé điện tử MoviePTIT (PNG, JPG, WEBP)
                      </span>
                    </div>
                  </div>
                ) : (
                  <form className="checkin-preview" onSubmit={handleImageSubmit}>
                    <img src={previewUrl} alt="QR Preview" />
                    <div>
                      <strong>{selectedFile?.name}</strong>
                      <span>Ảnh QR đã sẵn sàng để giải mã và soát vé.</span>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={checking || !selectedFile}
                    >
                      {checking ? (
                        'Đang giải mã...'
                      ) : (
                        <>
                          <CheckIcon size={16} />
                          <span>Xác nhận Check-in</span>
                        </>
                      )}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleClearImage}>
                      Đổi ảnh
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: QUICK CUSTOMER / BOOKING LOOKUP */}
            {activeTab === 'LOOKUP' && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div className="pos-search-box" style={{ flex: 1, minWidth: 220 }}>
                    <SearchIcon />
                    <input
                      type="text"
                      className="input"
                      placeholder="Tìm theo mã đơn (BK...), tài khoản khách, tên phim, số ghế..."
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className={`pos-time-pill ${
                        lookupFilter === 'TODAY' ? 'pos-time-pill--active' : ''
                      }`}
                      onClick={() => setLookupFilter('TODAY')}
                    >
                      Suất hôm nay
                    </button>
                    <button
                      type="button"
                      className={`pos-time-pill ${
                        lookupFilter === 'ALL' ? 'pos-time-pill--active' : ''
                      }`}
                      onClick={() => setLookupFilter('ALL')}
                    >
                      Tất cả đơn đã thanh toán
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={fetchBookingsForLookup}
                      disabled={loadingBookings}
                    >
                      <RefreshIcon size={14} />
                    </button>
                  </div>
                </div>

                {loadingBookings ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải danh sách đơn đặt vé...
                  </div>
                ) : filteredLookupBookings.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không tìm thấy đơn đặt vé hoàn tất nào khớp với điều kiện.
                  </div>
                ) : (
                  <div className="gate-lookup-list">
                    {filteredLookupBookings.slice(0, 25).map((b) => {
                      const seats =
                        b.seatCodes?.length > 0
                          ? b.seatCodes
                          : (b.tickets || []).map((t) => t.seatCode).filter(Boolean);
                      const checkedInCount = (b.tickets || []).filter((t) => t.checkedInAt).length;
                      const totalTickets = b.tickets?.length || seats.length || 0;
                      const allChecked = totalTickets > 0 && checkedInCount === totalTickets;

                      return (
                        <div key={b.bookingId} className="gate-lookup-item">
                          <div className="gate-lookup-info">
                            <div>
                              <span className="gate-lookup-code">{b.bookingCode}</span>
                              {b.username && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                                  • Khách: {b.username}
                                </span>
                              )}
                            </div>
                            <div className="gate-lookup-movie">{b.movieName}</div>
                            <div className="gate-lookup-meta">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <ClockIcon size={13} /> {formatShowtime(b.showtimeStart)}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <MapPinIcon size={13} /> {b.roomName || b.branchName}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <ArmchairIcon size={13} /> Ghế:{' '}
                                <strong style={{ color: '#0f172a' }}>{seats.join(', ')}</strong>
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {allChecked ? (
                              <span className="status-badge status--pending">
                                Đã vào rạp ({checkedInCount}/{totalTickets})
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                                disabled={checking}
                                onClick={() => performCodeCheckIn(b.bookingCode)}
                              >
                                Check-in ngay
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ===== SESSION CHECK-IN LOG ===== */}
          <section className="gate-card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800 }}>
                Nhật ký soát vé trong phiên ({filteredHistory.length})
              </h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'SUCCESS', label: 'Hợp lệ' },
                  { key: 'DUPLICATE', label: 'Quét trùng' },
                  { key: 'ERROR', label: 'Từ chối' },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`pos-time-pill ${
                      historyFilter === f.key ? 'pos-time-pill--active' : ''
                    }`}
                    onClick={() => setHistoryFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
                {recentCheckIns.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                    onClick={() => setRecentCheckIns([])}
                  >
                    Xóa nhật ký
                  </button>
                )}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div
                style={{
                  padding: '28px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  background: '#f8fafc',
                  borderRadius: 12,
                  border: '1px dashed var(--border)',
                  fontSize: '0.88rem',
                }}
              >
                Chưa có lượt check-in nào trong bộ lọc này.
              </div>
            ) : (
              <div className="admin-table-card" style={{ borderRadius: 12 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Giờ</th>
                      <th>Mã đơn / Vé</th>
                      <th>Phim & Ghế</th>
                      <th>Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr
                        key={item.id}
                        style={{ cursor: item.rawResponse ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (item.rawResponse) {
                            evaluateCheckInResult(item.rawResponse, item.code);
                          }
                        }}
                      >
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {item.time}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                          {item.code.length > 22 ? `${item.code.slice(0, 20)}...` : item.code}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>
                            {item.movieName}
                          </div>
                          {item.seats && (
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              Ghế: <strong>{item.seats}</strong>
                              {item.roomName ? ` • ${item.roomName}` : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              item.status === 'SUCCESS'
                                ? 'status--active'
                                : item.status === 'DUPLICATE'
                                ? 'status--pending'
                                : 'status--inactive'
                            }`}
                          >
                            {item.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ===== RIGHT COLUMN: LIVE GATE PASS VERDICT DISPLAY ===== */}
        <div className="gate-col">
          {!verdict ? (
            <div
              className="gate-card"
              style={{
                minHeight: 380,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: 14,
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'rgba(7, 86, 166, 0.08)',
                  color: 'var(--blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TicketIcon style={{ width: 34, height: 34 }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6 }}>
                  Sẵn sàng kiểm tra vé vào rạp
                </h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: 380, fontSize: '0.9rem' }}>
                  Kết quả xác thực vé, thông tin phòng chiếu, danh sách ghế và trạng thái vào cổng
                  sẽ hiển thị tức thì tại đây.
                </p>
              </div>
            </div>
          ) : verdict.type === 'ERROR' ? (
            <div className="gate-verdict gate-verdict--error">
              <div className="gate-verdict-banner">
                <div className="gate-verdict-icon">
                  <XCircleIcon style={{ width: 26, height: 26 }} />
                </div>
                <div>
                  <h2>Từ chối vào cổng</h2>
                  <p>Mã quét: {verdict.scannedCode}</p>
                </div>
              </div>
              <div className="gate-verdict-body">
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <AlertTriangleIcon size={18} />
                  <span>Lý do: {verdict.errorMsg}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  Vui lòng kiểm tra lại: đơn đặt vé đã thanh toán thành công chưa, có đúng chi nhánh
                  rạp hiện tại không, hoặc tra cứu theo tên khách ở tab{' '}
                  <strong>Tra cứu đơn vé</strong>.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setVerdict(null);
                      codeInputRef.current?.focus();
                    }}
                  >
                    Quét vé tiếp theo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`gate-verdict ${
                verdict.type === 'VALID' ? 'gate-verdict--valid' : 'gate-verdict--warning'
              }`}
            >
              <div className="gate-verdict-banner">
                <div className="gate-verdict-icon">
                  <CheckCircleIcon style={{ width: 26, height: 26 }} />
                </div>
                <div>
                  <h2>
                    {verdict.type === 'VALID'
                      ? 'Vé hợp lệ — Mời khách vào rạp'
                      : 'Cảnh báo — Vé đã được check-in trước đó'}
                  </h2>
                  <p>
                    {verdict.type === 'VALID'
                      ? `Đã xác nhận ${verdict.newlyCheckedIn} ghế vào phòng chiếu`
                      : `Có ${verdict.alreadyCount} ghế đã từng quét qua cổng kiểm soát`}
                  </p>
                </div>
              </div>

              <div className="gate-verdict-body">
                {/* Movie & Showtime Pass Summary */}
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#0756a6',
                      background: '#eff6ff',
                      padding: '3px 10px',
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  >
                    MÃ ĐƠN: {verdict.data?.bookingCode || '—'}
                  </span>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                    {verdict.data?.movieName || 'Vé xem phim'}
                  </h3>
                </div>

                <div className="gate-pass-grid">
                  <div className="gate-pass-field">
                    <small>Phòng chiếu</small>
                    <strong style={{ color: '#ea580c', fontSize: '1.08rem' }}>
                      {verdict.data?.roomName || '—'}
                    </strong>
                  </div>
                  <div className="gate-pass-field">
                    <small>Suất chiếu</small>
                    <strong>{formatShowtime(verdict.data?.showtimeStart)}</strong>
                  </div>
                  <div className="gate-pass-field">
                    <small>Chi nhánh rạp</small>
                    <strong>{verdict.data?.branchName || '—'}</strong>
                  </div>
                  <div className="gate-pass-field">
                    <small>Khách hàng</small>
                    <strong>{verdict.data?.customerName || 'Khách tại quầy / Vãng lai'}</strong>
                  </div>
                </div>

                {/* Seat Tickets Detail */}
                <div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: '#64748b',
                      marginBottom: 10,
                    }}
                  >
                    Danh sách ghế trong lượt soát ({(verdict.data?.tickets || []).length} vé)
                  </div>

                  <div className="gate-seat-grid">
                    {(verdict.data?.tickets || []).map((ticket) => (
                      <div
                        key={ticket.ticketId}
                        className={`gate-seat-badge ${
                          ticket.alreadyCheckedIn ? 'gate-seat-badge--already' : ''
                        }`}
                      >
                        <div className="gate-seat-badge-top">
                          <span className="gate-seat-badge-code">Ghế {ticket.seatCode}</span>
                          <span
                            className={`status-badge ${
                              ticket.alreadyCheckedIn ? 'status--pending' : 'status--active'
                            }`}
                          >
                            {ticket.alreadyCheckedIn ? 'Đã vào trước đó' : 'Mới vào'}
                          </span>
                        </div>
                        <small style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Mã vé: #{ticket.ticketId} • Giờ vào: {formatTimeOnly(ticket.checkedInAt)}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 12,
                    borderTop: '1px dashed var(--border)',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Nhấn Enter hoặc quét mã tiếp theo để tiếp tục
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setVerdict(null);
                      setActiveTab('SCANNER');
                      setTimeout(() => codeInputRef.current?.focus(), 50);
                    }}
                  >
                    <span>Soát khách tiếp theo</span>
                    <ArrowRightIcon size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
