import { useEffect, useId, useMemo, useState } from 'react';
import Button from '../../components/Common/Button';
import {
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  RefreshIcon,
  SearchIcon,
} from '../../components/Common/CinemaIcons';
import { cinemaTodayKey } from '../../utils/cinemaTime';
import CinemaPicker from './CinemaPicker';
import DayStrip from './DayStrip';
import MovieSchedule from './MovieSchedule';
import ScheduleHeader from './ScheduleHeader';
import ScheduleState, { ScheduleSkeleton } from './ScheduleState';
import ScheduleSummary from './ScheduleSummary';
import ScheduleToolbar from './ScheduleToolbar';
import TimeBoard from './TimeBoard';
import {
  buildScheduleDays,
  countByDaypart,
  describeFilter,
  describeSummary,
  dropStartedShowtimes,
  filterSchedule,
  sortMovies,
} from './scheduleModel';
import useActiveBranches from './useActiveBranches';
import useBranchSchedule from './useBranchSchedule';
import useCinemaNow from './useCinemaNow';
import useScheduleParams from './useScheduleParams';
import './SchedulePage.css';

const NOW_SHOWING = '/movies?status=NOW_SHOWING';

export default function SchedulePage() {
  const { branches, loading, error, retry } = useActiveBranches();
  const now = useCinemaNow();
  const todayKey = cinemaTodayKey(now);
  const days = useMemo(() => buildScheduleDays(todayKey), [todayKey]);
  const { branch, dayKey, view, setBranch, setDay, setView } = useScheduleParams(branches, todayKey);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [daypart, setDaypart] = useState('all');
  const [query, setQuery] = useState('');
  const headingId = useId();
  // Không đặt key theo rạp: đổi rạp vẫn giữ ngày, cách xem và bộ lọc để so sánh các rạp.
  const schedule = useBranchSchedule(branch?.branchId ?? null, dayKey);

  const branchName = branch?.name;
  useEffect(() => {
    document.title = branchName ? `Lịch chiếu ${branchName} | MoviePTIT` : 'Lịch chiếu | MoviePTIT';
  }, [branchName]);

  const day = days.find((item) => item.key === dayKey) || days[0];
  const nextDay = days[days.indexOf(day) + 1];
  const ready = schedule.state === 'ready';
  const { movies: upcoming, startedCount } = useMemo(
    () => dropStartedShowtimes(schedule.movies, now),
    [schedule.movies, now],
  );
  const counts = ready ? countByDaypart(upcoming) : null;

  // Ngày mới (hoặc suất vừa bắt đầu) không còn suất ở buổi đang chọn thì quay về "Cả ngày".
  if (counts && daypart !== 'all' && counts[daypart] === 0) setDaypart('all');

  const visible = sortMovies(filterSchedule(upcoming, { daypart, query }));
  const slotCount = visible.reduce((total, movie) => total + movie.showtimes.length, 0);
  const canSwitch = branches.length > 1;

  function clearFilters() {
    setDaypart('all');
    setQuery('');
  }

  if (loading) {
    return (
      <div className="sc-page">
        <div className="sc-wrap sc-top">
          <h1 className="sr-only">Lịch chiếu</h1>
          <div className="sc-head" aria-hidden="true">
            <span className="sc-skeleton sc-skeleton--title" />
            <span className="sc-skeleton sc-skeleton--line" />
          </div>
          <ScheduleSkeleton label="Đang tải danh sách rạp" />
        </div>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="sc-page">
        <div className="sc-wrap sc-top">
          <h1 className="sc-head__title">Lịch chiếu</h1>
          {error ? (
            <ScheduleState error title="Không tải được danh sách rạp" detail="Kiểm tra kết nối mạng rồi bấm Thử lại.">
              <Button variant="primary" icon={<RefreshIcon size={16} />} onClick={retry}>Thử lại</Button>
            </ScheduleState>
          ) : (
            <ScheduleState
              icon={<BuildingIcon size={24} />}
              title="Chưa có rạp nào mở bán vé"
              detail="Bạn vẫn xem được thông tin phim và quay lại đặt vé sau."
            >
              <Button variant="primary" to={NOW_SHOWING}>Xem phim đang chiếu</Button>
            </ScheduleState>
          )}
        </div>
      </div>
    );
  }

  let summaryText = null;
  if (schedule.state === 'loading') summaryText = `Đang tải lịch chiếu ngày ${day.shortLabel}.`;
  else if (ready && visible.length > 0) summaryText = describeSummary({ movieCount: visible.length, slotCount, daypart, query });
  const summaryNote = ready && upcoming.length > 0 && startedCount > 0 ? `Đã ẩn ${startedCount} suất đã bắt đầu.` : null;

  let content;
  if (schedule.state === 'loading') {
    content = <ScheduleSkeleton />;
  } else if (schedule.state === 'error') {
    content = (
      <ScheduleState error title={`Không tải được lịch chiếu ngày ${day.shortLabel}`} detail="Kiểm tra kết nối mạng rồi bấm Thử lại.">
        <Button variant="primary" icon={<RefreshIcon size={16} />} onClick={schedule.retry}>Thử lại</Button>
      </ScheduleState>
    );
  } else if (schedule.movies.length === 0) {
    content = (
      <ScheduleState
        icon={<CalendarIcon size={24} />}
        title={`Rạp chưa có suất chiếu nào ngày ${day.shortLabel}`}
        detail="Lịch thường được xếp trước khoảng một tuần."
      >
        {nextDay && <Button variant="primary" onClick={() => setDay(nextDay.key)}>Xem ngày {nextDay.shortLabel}</Button>}
        {canSwitch && (
          <Button variant={nextDay ? 'secondary' : 'primary'} icon={<BuildingIcon size={16} />} aria-haspopup="dialog" onClick={() => setPickerOpen(true)}>
            Đổi rạp
          </Button>
        )}
        {!nextDay && !canSwitch && <Button variant="primary" to={NOW_SHOWING}>Xem phim đang chiếu</Button>}
      </ScheduleState>
    );
  } else if (upcoming.length === 0) {
    content = (
      <ScheduleState
        icon={<ClockIcon size={24} />}
        title={day.isToday ? 'Các suất hôm nay đã bắt đầu' : `Các suất ngày ${day.shortLabel} đã bắt đầu`}
        detail={`Đã ẩn ${startedCount} suất đã bắt đầu.`}
      >
        {nextDay
          ? <Button variant="primary" onClick={() => setDay(nextDay.key)}>{day.isToday ? 'Xem lịch ngày mai' : `Xem ngày ${nextDay.shortLabel}`}</Button>
          : <Button variant="primary" to={NOW_SHOWING}>Xem phim đang chiếu</Button>}
      </ScheduleState>
    );
  } else if (visible.length === 0) {
    content = (
      <ScheduleState
        icon={<SearchIcon size={24} />}
        title="Không có suất nào khớp bộ lọc"
        detail={`Đang lọc ${describeFilter({ daypart, query })}.`}
      >
        <Button variant="primary" onClick={clearFilters}>Xóa bộ lọc</Button>
      </ScheduleState>
    );
  } else {
    content = view === 'time'
      ? <TimeBoard movies={visible} now={now} />
      : <MovieSchedule movies={visible} now={now} />;
  }

  return (
    <div className="sc-page">
      <div className="sc-wrap sc-top">
        <ScheduleHeader
          branch={branch}
          canSwitch={canSwitch}
          pickerOpen={pickerOpen}
          onSwitch={() => setPickerOpen(true)}
        />
      </div>

      <div className="sc-bar">
        <div className="sc-bar__days">
          <div className="sc-wrap">
            <DayStrip days={days} value={day.key} onChange={setDay} />
          </div>
        </div>
        <div className="sc-bar__tools">
          <div className="sc-wrap">
            <ScheduleToolbar
              view={view}
              onViewChange={setView}
              daypart={daypart}
              counts={counts}
              onDaypartChange={setDaypart}
              query={query}
              onQueryChange={setQuery}
              showSearch={upcoming.length >= 2 || query !== ''}
            />
          </div>
        </div>
      </div>

      <section className="sc-wrap sc-body" aria-labelledby={headingId}>
        <ScheduleSummary day={day} headingId={headingId} text={summaryText} note={summaryNote} />
        <div className="sc-content" aria-busy={schedule.state === 'loading'}>{content}</div>
      </section>

      {pickerOpen && (
        <CinemaPicker
          branches={branches}
          currentId={branch.branchId}
          onSelect={setBranch}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
