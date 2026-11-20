// Hàm thuần cho màn soát vé: định dạng giờ rạp và phiên check-in lưu trên trình duyệt.
import { cinemaTodayKey, formatCinema, formatDateTime } from '../../../utils/cinemaTime';

export const formatShowtime = (value) => formatDateTime(value);

export const TIME_WITH_SECONDS = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

export const formatTimeOnly = (value) => formatCinema(value, TIME_WITH_SECONDS);

export const CHECKIN_STORAGE_KEY = 'movieptit_checkin_session_v1';

export const getTodayDateKey = () => cinemaTodayKey();

export const loadPersistedSession = () => {
  try {
    const raw = localStorage.getItem(CHECKIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.dateKey !== getTodayDateKey()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
