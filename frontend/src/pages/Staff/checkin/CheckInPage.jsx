import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import { StaffPageHeading } from '../StaffUI';
import { bookingApi, ticketApi } from '../../../api';
import { ScanIcon, SearchIcon, TicketIcon } from '../../../components/Common/CinemaIcons';
import {
  cinemaTodayKey,
  formatCinema,
  parseLocalDateTime,
  toCinemaDateKey,
} from '../../../utils/cinemaTime';

// Thời gian hiển thị và lọc "hôm nay" theo giờ rạp, không theo múi giờ của máy quầy.
import {
  TIME_WITH_SECONDS,
  formatTimeOnly,
  CHECKIN_STORAGE_KEY,
  getTodayDateKey,
  loadPersistedSession,
} from './checkInUtils';
import CheckInHistoryLog from './CheckInHistoryLog';
import CheckInVerdictPanel from './CheckInVerdictPanel';
import CheckInLookupTab from './CheckInLookupTab';
import CheckInScannerTab from './CheckInScannerTab';

export default function CheckInPage() {
  const initialSession = useMemo(() => loadPersistedSession(), []);

  const [activeTab, setActiveTab] = useState(initialSession?.activeTab || 'SCANNER'); // 'SCANNER' | 'LOOKUP'
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  // Verdict state: { type: 'VALID' | 'WARNING' | 'ERROR', data?: TicketCheckInResponse, errorMsg?: string, scannedCode?: string }
  const [verdict, setVerdict] = useState(initialSession?.verdict || null);

  // Live WebRTC Camera (with BarcodeDetector when supported + jsQR fallback)
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const cameraRequest = useRef(null);
  const checkInPending = useRef(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Quick Booking Lookup
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupFilter, setLookupFilter] = useState(initialSession?.lookupFilter || 'TODAY'); // 'TODAY' | 'ALL'

  // Session History & Counters
  const [recentCheckIns, setRecentCheckIns] = useState(() =>
    Array.isArray(initialSession?.recentCheckIns) ? initialSession.recentCheckIns : []
  );
  const [historyFilter, setHistoryFilter] = useState(initialSession?.historyFilter || 'ALL'); // 'ALL' | 'SUCCESS' | 'DUPLICATE' | 'ERROR'
  const [historySearch, setHistorySearch] = useState('');

  const codeInputRef = useRef(null);

  // Stop camera on unmount or tab switch
  const stopCamera = () => {
    cameraRequest.current = null;
    setCameraStarting(false);
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

  // Load bookings & sync already checked-in tickets of today
  const fetchBookingsForLookup = async () => {
    setLoadingBookings(true);
    setLookupError('');
    try {
      const res = await bookingApi.getAll();
      const all = (res.data.result || []).filter(
        (b) => b.status === 'COMPLETED' && b.paymentStatus === 'PAID'
      );
      all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setBookings(all);

      // Hydrate today's already checked-in bookings from DB into recentCheckIns if not yet recorded
      const todayKey = getTodayDateKey();
      const dbCheckedToday = [];
      all.forEach((b) => {
        const checkedTickets = (b.tickets || []).filter((t) => {
          if (!t.checkedInAt) return false;
          return toCinemaDateKey(t.checkedInAt) === todayKey;
        });

        if (checkedTickets.length > 0) {
          const latestTime = checkedTickets
            .map((t) => parseLocalDateTime(t.checkedInAt)?.getTime() || 0)
            .reduce((max, cur) => Math.max(max, cur), 0);

          dbCheckedToday.push({
            id: `db-${b.bookingId}`,
            sortTime: latestTime,
            time: formatTimeOnly(new Date(latestTime)),
            code: b.bookingCode || `#${b.bookingId}`,
            movieName: b.movieName || 'Vé xem phim',
            seats: checkedTickets.map((t) => t.seatCode).filter(Boolean).join(', '),
            roomName: b.roomName || '',
            status: 'SUCCESS',
            statusLabel: `Hợp lệ (${checkedTickets.length} ghế)`,
            rawResponse: {
              bookingId: b.bookingId,
              bookingCode: b.bookingCode,
              customerName: b.username,
              movieName: b.movieName,
              branchName: b.branchName,
              roomName: b.roomName,
              showtimeStart: b.showtimeStart,
              tickets: (b.tickets || []).map((t) => ({
                ticketId: t.id,
                seatCode: t.seatCode,
                checkedInAt: t.checkedInAt,
                checkedInBy: t.checkedInBy,
                checkedInByName: t.checkedInByName,
                alreadyCheckedIn: false,
              })),
            },
          });
        }
      });

      if (dbCheckedToday.length > 0) {
        dbCheckedToday.sort((a, b) => b.sortTime - a.sortTime);
        setRecentCheckIns((prev) => {
          const existingCodes = new Set(prev.map((item) => item.code));
          const missingFromDb = dbCheckedToday.filter((item) => !existingCodes.has(item.code));
          if (missingFromDb.length === 0) return prev;
          return [...prev, ...missingFromDb].slice(0, 50);
        });
      }
    } catch {
      setLookupError('Không tải được danh sách đơn đặt vé.');
    } finally {
      setLoadingBookings(false);
    }
  };

  // Persist check-in state to localStorage so F5 does not lose session data
  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKIN_STORAGE_KEY,
        JSON.stringify({
          dateKey: getTodayDateKey(),
          recentCheckIns,
          verdict,
          activeTab,
          lookupFilter,
          historyFilter,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [recentCheckIns, verdict, activeTab, lookupFilter, historyFilter]);

  // Fetch bookings on initial mount to restore/sync DB check-in stats
  useEffect(() => {
    fetchBookingsForLookup();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (activeTab === 'LOOKUP' && bookings.length === 0) {
      fetchBookingsForLookup();
    }
    if (activeTab !== 'SCANNER') {
      stopCamera();
    } else {
      const focusTimer = setTimeout(() => codeInputRef.current?.focus(), 80);
      return () => clearTimeout(focusTimer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const recordHistory = (entry) => {
    setRecentCheckIns((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: formatCinema(new Date(), TIME_WITH_SECONDS),
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

  const reportCheckInError = (err, label, fallback) => {
    const httpStatus = err.response?.status;
    const technicalFailure = !httpStatus || httpStatus >= 500 || [401, 408, 429].includes(httpStatus);
    const errorMsg = technicalFailure
      ? 'Chưa xác nhận được kết quả soát vé. Hãy kiểm tra kết nối rồi quét lại.'
      : err.response?.data?.message || fallback;
    setVerdict({ type: technicalFailure ? 'CONNECTION' : 'ERROR', errorMsg, scannedCode: label });
    if (!technicalFailure) {
      recordHistory({ code: label, movieName: errorMsg, seats: '', roomName: '', status: 'ERROR', statusLabel: 'Từ chối' });
    }
    toast.error(errorMsg);
  };

  const performCodeCheckIn = async (rawCode) => {
    if (checkInPending.current) return;
    const trimmed = String(rawCode || '').trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập mã vé, mã đơn hoặc quét QR');
      return;
    }

    checkInPending.current = true;
    stopCamera();
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
      reportCheckInError(err, trimmed, 'Mã vé không hợp lệ hoặc không thuộc chi nhánh.');
    } finally {
      checkInPending.current = false;
      setChecking(false);
      setTimeout(() => codeInputRef.current?.focus(), 60);
    }
  };

  const handleSubmitCode = async (event) => {
    event.preventDefault();
    await performCodeCheckIn(code);
  };

  // Start Live Camera with automatic continuous QR detection (BarcodeDetector + jsQR universal fallback)
  const startCamera = async () => {
    if (cameraRequest.current || streamRef.current || checkInPending.current) return;
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ mở Camera trực tiếp.');
      return;
    }
    const request = {};
    cameraRequest.current = request;
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (cameraRequest.current !== request) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (streamRef.current === stream && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      const nativeDetector =
        'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
      const scanCanvas = document.createElement('canvas');
      const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
      let isProcessingFrame = false;

      scanLoopRef.current = setInterval(async () => {
        if (isProcessingFrame) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

        isProcessingFrame = true;
        try {
          // 1. Try native BarcodeDetector first if supported
          if (nativeDetector) {
            try {
              const barcodes = await nativeDetector.detect(video);
              if (streamRef.current !== stream) return;
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                const detected = barcodes[0].rawValue.trim();
                if (detected) {
                  stopCamera();
                  performCodeCheckIn(detected);
                  return;
                }
              }
            } catch {
              // Fall through to jsQR canvas scanner
            }
          }

          // 2. Universal Canvas + jsQR real-time decoder (works on Windows/macOS/Linux/iOS/Android)
          if (scanCtx) {
            scanCanvas.width = video.videoWidth;
            scanCanvas.height = video.videoHeight;
            scanCtx.drawImage(video, 0, 0, scanCanvas.width, scanCanvas.height);
            const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (qrResult && qrResult.data && qrResult.data.trim()) {
              const detected = qrResult.data.trim();
              stopCamera();
              performCodeCheckIn(detected);
            }
          }
        } catch {
          // ignore transient frame error
        } finally {
          isProcessingFrame = false;
        }
      }, 250);
    } catch (err) {
      if (cameraRequest.current !== request) return;
      stopCamera();
      setCameraError(err.name === 'NotAllowedError'
        ? 'Quyền camera bị từ chối. Cho phép camera trong trình duyệt rồi thử lại, hoặc nhập mã vé.'
        : 'Không mở được camera. Kiểm tra thiết bị rồi thử lại, hoặc nhập mã vé.');
    } finally {
      if (cameraRequest.current === request) {
        cameraRequest.current = null;
        setCameraStarting(false);
      }
    }
  };

  // Capture current video frame & decode via jsQR first (or fallback to backend QR decoder)
  const captureCameraFrameAndCheckIn = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || checkInPending.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (qrResult && qrResult.data && qrResult.data.trim()) {
        stopCamera();
        await performCodeCheckIn(qrResult.data.trim());
        return;
      }
    } catch {
      // Fallback to backend image upload below
    }

    const stream = streamRef.current;
    canvas.toBlob(async (blob) => {
      if (!blob || streamRef.current !== stream || !stream) return;
      const file = new File([blob], 'camera-capture.png', { type: 'image/png' });
      await checkInWithFile(file);
    }, 'image/png');
  };

  const checkInWithFile = async (targetFile) => {
    if (!targetFile || checkInPending.current) return;

    checkInPending.current = true;
    stopCamera();
    setChecking(true);
    try {
      const res = await ticketApi.checkInByQRImage(targetFile);
      const data = res.data.result;
      evaluateCheckInResult(data, targetFile.name);
    } catch (err) {
      reportCheckInError(err, targetFile.name, 'Không đọc được mã QR từ khung hình này.');
    } finally {
      checkInPending.current = false;
      setChecking(false);
    }
  };

  // Filtered bookings for Lookup tab
  const filteredLookupBookings = useMemo(() => {
    const todayStr = cinemaTodayKey();
    return bookings.filter((b) => {
      if (lookupFilter === 'TODAY' && b.showtimeStart) {
        if (toCinemaDateKey(b.showtimeStart) !== todayStr) return false;
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
    return recentCheckIns.filter((item) => {
      if (historyFilter !== 'ALL' && item.status !== historyFilter) return false;
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase().trim();
      return (
        (item.code || '').toLowerCase().includes(q) ||
        (item.movieName || '').toLowerCase().includes(q) ||
        (item.seats || '').toLowerCase().includes(q)
      );
    });
  }, [recentCheckIns, historyFilter, historySearch]);

  return (
    <div className="gate-page">
      {/* ===== TOP GATE CONTROL BAR ===== */}
      <StaffPageHeading icon={ScanIcon} title="Soát vé vào rạp" description="Quét mã QR, nhập mã vé hoặc tìm đơn của khách." />
      <div className="gate-top-bar">

        <div className="gate-stats-row">
          <div className="gate-stat-chip">
            <span className="gate-stat-chip-dot" style={{ background: '#0756a6' }} />
            <div>
              <small>Lượt trong nhật ký</small>
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
              <small>Từ chối</small>
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
                aria-pressed={activeTab === 'SCANNER'}
                onClick={() => setActiveTab('SCANNER')}
              >
                <TicketIcon />
                <span>Máy quét / Mã vé</span>
              </button>

              <button
                type="button"
                className={`gate-mode-tab ${activeTab === 'LOOKUP' ? 'gate-mode-tab--active' : ''}`}
                aria-pressed={activeTab === 'LOOKUP'}
                onClick={() => setActiveTab('LOOKUP')}
              >
                <SearchIcon size={18} />
                <span>Tra cứu đơn vé</span>
              </button>
            </div>

            {/* TAB 1: BARCODE / QR SCANNER & MANUAL CODE */}
            {activeTab === 'SCANNER' && (
              <CheckInScannerTab
                cameraActive={cameraActive}
                cameraError={cameraError}
                cameraStarting={cameraStarting}
                captureCameraFrameAndCheckIn={captureCameraFrameAndCheckIn}
                checking={checking}
                code={code}
                codeInputRef={codeInputRef}
                handleSubmitCode={handleSubmitCode}
                setCode={setCode}
                startCamera={startCamera}
                stopCamera={stopCamera}
                videoRef={videoRef}
              />
            )}

            {/* TAB 2: QUICK CUSTOMER / BOOKING LOOKUP */}
            {activeTab === 'LOOKUP' && (
              <CheckInLookupTab
                checking={checking}
                fetchBookingsForLookup={fetchBookingsForLookup}
                filteredLookupBookings={filteredLookupBookings}
                loadingBookings={loadingBookings}
                lookupError={lookupError}
                lookupFilter={lookupFilter}
                lookupQuery={lookupQuery}
                performCodeCheckIn={performCodeCheckIn}
                setLookupFilter={setLookupFilter}
                setLookupQuery={setLookupQuery}
              />
            )}
          </section>

        </div>

        {/* ===== RIGHT COLUMN: LIVE GATE PASS VERDICT DISPLAY ===== */}
        <CheckInVerdictPanel
          checking={checking}
          codeInputRef={codeInputRef}
          setActiveTab={setActiveTab}
          setVerdict={setVerdict}
          verdict={verdict}
        />
          {/* ===== SESSION CHECK-IN LOG ===== */}
          <CheckInHistoryLog
            evaluateCheckInResult={evaluateCheckInResult}
            filteredHistory={filteredHistory}
            historyFilter={historyFilter}
            historySearch={historySearch}
            recentCheckIns={recentCheckIns}
            setHistoryFilter={setHistoryFilter}
            setHistorySearch={setHistorySearch}
            setRecentCheckIns={setRecentCheckIns}
            setVerdict={setVerdict}
          />
      </div>
    </div>
  );
}
