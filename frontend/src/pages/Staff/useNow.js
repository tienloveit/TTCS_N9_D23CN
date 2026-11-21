import { useEffect, useState } from 'react';

/** Thời điểm hiện tại (ms), cập nhật theo chu kỳ cho đồng hồ đếm ngược và nhãn "còn X phút". */
export default function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
