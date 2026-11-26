import { useEffect, useMemo, useState } from 'react';
import { showtimeApi } from '../../api';

/**
 * Lịch chiếu của một rạp trong một ngày.
 * Kết quả gắn với đúng request đã gửi, nên phản hồi cũ (đổi rạp, đổi ngày nhanh) không ghi đè phản hồi mới.
 */
export default function useBranchSchedule(branchId, dayKey) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const request = useMemo(() => ({ branchId, dayKey, attempt }), [branchId, dayKey, attempt]);

  useEffect(() => {
    if (request.branchId == null || !request.dayKey) return undefined;
    let ignore = false;
    showtimeApi.getByBranch(request.branchId, request.dayKey)
      .then(({ data }) => {
        if (!ignore) setResult({ request, movies: data?.result || [] });
      })
      .catch(() => {
        if (!ignore) setResult({ request, error: true });
      });
    return () => { ignore = true; };
  }, [request]);

  const current = result?.request === request ? result : null;
  return {
    state: !current ? 'loading' : current.error ? 'error' : 'ready',
    movies: current?.movies || [],
    retry: () => setAttempt((value) => value + 1),
  };
}
