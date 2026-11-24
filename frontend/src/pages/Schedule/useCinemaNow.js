import { useEffect, useState } from 'react';

/** Thời điểm hiện tại, cập nhật định kỳ để ẩn suất vừa bắt đầu và đổi ngày khi qua nửa đêm. */
export default function useCinemaNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, intervalMs);
    // Quay lại tab sau một lúc thì cập nhật ngay, không chờ tới nhịp kế tiếp.
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
