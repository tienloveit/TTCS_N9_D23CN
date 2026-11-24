import { useCallback, useEffect, useState } from 'react';
import { showtimeApi } from '../../api';
import { cinemaTodayKey } from '../../utils/cinemaTime';
import useNow from '../../utils/useNow';

export default function useShiftSchedule() {
  const now = useNow(30_000);
  const date = cinemaTodayKey(new Date(now));
  const [attempt, setAttempt] = useState(0);
  const [schedule, setSchedule] = useState(null);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    let current = true;
    showtimeApi.getToday().then(({ data }) => {
      if (current) setSchedule({ date, attempt, state: 'ready', shows: data.result || [] });
    }).catch(() => {
      if (current) setSchedule({ date, attempt, state: 'error', shows: [] });
    });
    return () => { current = false; };
  }, [date, attempt]);
  const result = schedule?.date === date && schedule.attempt === attempt
    ? schedule
    : { state: 'loading', shows: [] };
  return { ...result, date, now, retry };
}
