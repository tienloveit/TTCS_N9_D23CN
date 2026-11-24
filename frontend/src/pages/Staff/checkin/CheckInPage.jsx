import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import { OpsPage, OpsPanel, ShowTime, StatStrip, Tabs } from '../../../components/Ops';
import useShiftSchedule from '../useShiftSchedule';
import { bookingApi, ticketApi } from '../../../api';
import {
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

const PAID_BOOKINGS = { status: 'COMPLETED', paymentStatus: 'PAID' };
// Tab tra cứu hiển thị tối đa 25 đơn; lịch sử phiên giữ tối đa 50 lượt.
const LOOKUP_LIMIT = 25;
const HISTORY_LIMIT = 50;
const LOOKUP_DEBOUNCE_MS = 300;

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
  const lookupInputRef = useRef(null);
  const schedule = useShiftSchedule();

  // Dừng camera khi rời trang hoặc đổi tab.
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

  // Tra cứu nhanh: backend lọc đơn đã thanh toán theo từ khóa và ngày chiếu, trả tối đa một trang.
  const lookupRequest = useRef(0);
  const fetchBookingsForLookup = useCallback(async () => {
    const request = ++lookupRequest.current;
    setLoadingBookings(true);
    setLookupError('');
    try {
      const res = await bookingApi.search({
        ...PAID_BOOKINGS,
        ...(lookupQuery.trim() ? { q: lookupQuery.trim() } : {}),
        ...(lookupFilter === 'TODAY' ? { showtimeDate: getTodayDateKey() } : {}),
        size: LOOKUP_LIMIT,
      });
      if (request !== lookupRequest.current) return;
      setBookings(res.data.result?.content || []);
    } catch {
      if (request === lookupRequest.current) setLookupError('Không tải được danh sách đơn đặt vé.');
    } finally {
      if (request === lookupRequest.current) setLoadingBookings(false);
    }
  }, [lookupFilter, lookupQuery]);

  // Đưa các vé đã soát hôm nay (ghi trong DB, có thể từ quầy khác) vào lịch sử phiên nếu chưa có.
  const syncTodayCheckIns = async () => {
    try {
      const todayKey = getTodayDateKey();
      const res = await bookingApi.search({
        ...PAID_BOOKINGS,
        checkedInDate: todayKey,
        size: HISTORY_LIMIT,
      });
      const dbCheckedToday = [];
      (res.data.result?.content || []).forEach((b) => {
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
          return [...prev, ...missingFromDb].slice(0, HISTORY_LIMIT);
        });
      }
    } catch {
      // Lịch sử của phiên hiện tại vẫn dùng được; lần soát sau sẽ đồng bộ lại.
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

  // Khi mở trang: khôi phục số liệu soát vé hôm nay từ DB.
  useEffect(() => {
    syncTodayCheckIns();
    return () => stopCamera();
  }, []);

  // Tra cứu theo từ khóa/bộ lọc khi đang ở tab tra cứu (chờ ngừng gõ rồi mới gọi).
  useEffect(() => {
    if (activeTab !== 'LOOKUP') return undefined;
    const timer = setTimeout(fetchBookingsForLookup, LOOKUP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [activeTab, fetchBookingsForLookup]);

  useEffect(() => {
    if (activeTab !== 'SCANNER') {
      stopCamera();
    }
  }, [activeTab]);

  const recordHistory = (entry) => {
    setRecentCheckIns((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sortTime: Date.now(),
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
      toast.warn('Vé đã được soát trước đó');
    } else {
      toast.success(`Đã soát ${newlyCheckedIn} vé`);
    }
  };

  const reportCheckInError = (err, label, fallback) => {
    const httpStatus = err.response?.status;
    const technicalFailure = !httpStatus || httpStatus >= 500 || [401, 408, 429].includes(httpStatus);
    const errorMsg = technicalFailure
      ? 'Chưa xác nhận được kết quả soát vé. Hãy kiểm tra kết nối rồi quét lại.'
      : err.response?.data?.message || fallback;
    const timing = /^(Chưa tới giờ soát vé|Suất chiếu đã kết thúc)/i.test(errorMsg);
    const type = technicalFailure ? 'CONNECTION' : timing ? 'TIMING' : 'ERROR';
    setVerdict({ type, errorMsg, scannedCode: label });
    if (!technicalFailure) {
      recordHistory({ code: label, movieName: errorMsg, seats: '', roomName: '', status: 'ERROR', statusLabel: 'Từ chối' });
    }
    toast.error(errorMsg);
  };

  const performCodeCheckIn = async (rawCode) => {
    if (checkInPending.current) return;
    const trimmed = String(rawCode || '').trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập mã đơn (BK-...) hoặc quét QR');
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
      // Cập nhật số vé đã soát trong danh sách tra cứu đang hiển thị.
      if (activeTab === 'LOOKUP' || bookings.length > 0) {
        fetchBookingsForLookup();
      }
    } catch (err) {
      reportCheckInError(err, trimmed, 'Mã vé không hợp lệ hoặc không thuộc chi nhánh.');
    } finally {
      checkInPending.current = false;
      setChecking(false);
      setTimeout(() => (activeTab === 'LOOKUP' ? lookupInputRef : codeInputRef).current?.focus(), 60);
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

  // Danh sách tra cứu đã được backend lọc theo từ khóa và ngày chiếu.
  const filteredLookupBookings = bookings;

  // Session counters
  const stats = useMemo(() => {
    const valid = recentCheckIns.filter((i) => i.status === 'SUCCESS').length;
    const duplicate = recentCheckIns.filter((i) => i.status === 'DUPLICATE').length;
    const failed = recentCheckIns.filter((i) => i.status === 'ERROR').length;
    return { valid, duplicate, failed };
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

  const next = schedule.shows
    .filter(show => show.status === 'OPEN' && parseLocalDateTime(show.startTime) > schedule.now)
    .sort((first, second) => parseLocalDateTime(first.startTime) - parseLocalDateTime(second.startTime))[0];
  const reopenResult = (item) => {
    const tickets = item.rawResponse.tickets || [];
    const alreadyCount = tickets.filter(ticket => ticket.alreadyCheckedIn).length;
    setVerdict({
      type: alreadyCount ? 'WARNING' : 'VALID', historical: true, data: item.rawResponse, scannedCode: item.code,
      newlyCheckedIn: tickets.length - alreadyCount, alreadyCount,
    });
  };

  return (
    <OpsPage title="Soát vé vào rạp" description="Quét mã QR, nhập mã đơn hoặc tìm đơn của khách.">
      <StatStrip items={[
        { label: 'Lượt soát hợp lệ hôm nay', value: stats.valid },
        { label: 'Đã quét trùng', value: stats.duplicate, tone: 'warning' },
        { label: 'Từ chối', value: stats.failed, tone: 'danger' },
        { label: 'Suất kế tiếp', value: next ? <ShowTime value={next.startTime} /> : '—' },
      ]} />
      <div className="o-work-pair">
        <OpsPanel title="Soát vé">
          <Tabs label="Cách soát vé" options={[
            { value: 'SCANNER', label: 'Quét mã QR' },
            { value: 'LOOKUP', label: 'Tra cứu mã đơn' },
          ]} value={activeTab} onChange={setActiveTab}>
            {activeTab === 'SCANNER' ? (
              <CheckInScannerTab {...{
                cameraActive, cameraError, cameraStarting, captureCameraFrameAndCheckIn,
                checking, code, codeInputRef, handleSubmitCode, setCode, startCamera, stopCamera, videoRef,
              }} />
            ) : (
              <CheckInLookupTab {...{
                checking, fetchBookingsForLookup, filteredLookupBookings, loadingBookings, lookupError,
                lookupFilter, lookupQuery, lookupInputRef, performCodeCheckIn, setLookupFilter, setLookupQuery,
              }} />
            )}
          </Tabs>
        </OpsPanel>
        <CheckInVerdictPanel {...{ checking, codeInputRef, setActiveTab, setVerdict, verdict }} />
      </div>
      <CheckInHistoryLog {...{
        reopenResult, filteredHistory, historyFilter, historySearch, recentCheckIns,
        setHistoryFilter, setHistorySearch, setRecentCheckIns, setVerdict,
      }} />
    </OpsPage>
  );
}
