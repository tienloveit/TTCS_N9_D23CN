import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { showtimeApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  FilmIcon,
  GlobeIcon,
  MapPinIcon,
  PhoneIcon,
  RefreshIcon,
  SearchIcon,
  TicketIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import { formatScreening } from '../../utils/cinemaFormats';
import { buildUpcomingDays, formatRoomType, formatTime, getAgeBadgeTone, getCinemaLocalNow, parseLocalDateTime } from './branchUtils';

const DAYS_PER_WEEK = 7;

export function BranchMessage({ icon = <CalendarIcon size={23} />, title, detail, loading, error, onRetry, children }) {
  if (loading) {
    return (
      <div className="br-loading" role="status">
        <span>{title}</span>
        <div className="br-skeleton" aria-hidden="true" />
        <div className="br-skeleton" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="br-message">
      <div className="br-message-icon" aria-hidden="true">
        {error ? <AlertCircleIcon size={23} /> : icon}
      </div>
      <div role={error ? 'alert' : 'status'}>
        <h3>{title}</h3>
        {detail && <p>{detail}</p>}
      </div>
      {onRetry && (
        <button type="button" className="br-btn" onClick={onRetry}>
          <RefreshIcon size={16} />
          Thử lại
        </button>
      )}
      {children}
    </div>
  );
}

export function BranchSpotlight({ branch, showDetails }) {
  const Heading = showDetails ? 'h2' : 'h1';
  const address = [branch.address, branch.city].filter(Boolean).join(', ');
  const mapQuery = encodeURIComponent([branch.name, address].filter(Boolean).join(', '));

  return (
    <section className="br-spotlight">
      <div>
        <Heading>{branch.name}</Heading>
        {address && <p><MapPinIcon size={17} />{address}</p>}
        {branch.phone && <p><PhoneIcon size={16} /><a href={`tel:${branch.phone}`}>{branch.phone}</a></p>}
      </div>
      <div className="br-spotlight-actions">
        <a
          className="br-btn"
          href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Chỉ đường <ExternalLinkIcon size={15} />
        </a>
        {showDetails && (
          <Link to={`/branch/${branch.branchId}`} className="br-btn br-btn--accent">
            Chi tiết rạp <ArrowRightIcon size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

function WeekPicker({ days, dayIndex, week, setDayIndex, changeWeek }) {
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <>
      <div className="br-week">
        <h2 id="br-schedule-heading"><CalendarIcon size={19} />Lịch chiếu</h2>
        <div className="br-week-controls">
          <button type="button" className="br-btn br-icon-btn" aria-label="Tuần trước" onClick={() => changeWeek(-1)} disabled={week === 0}>
            <ChevronLeftIcon size={20} />
          </button>
          <span className="br-week-range">{first.dayNum}/{first.monthNum} – {last.dayNum}/{last.monthNum}</span>
          <button type="button" className="br-btn br-icon-btn" aria-label="Tuần sau" onClick={() => changeWeek(1)}>
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>
      <div className="br-dates" role="group" aria-label="Chọn ngày chiếu">
        {days.map((day, index) => (
          <button
            key={day.iso}
            type="button"
            className="br-date"
            aria-label={day.fullLabel}
            aria-pressed={dayIndex === index}
            onClick={() => setDayIndex(index)}
          >
            <span className="br-date-short">{day.shortDay.replace('Th ', 'T')}</span>
            <span className="br-date-long">{day.relativeLabel}</span>
            <time dateTime={day.iso}>{day.dayNum}</time>
          </button>
        ))}
      </div>
    </>
  );
}

export function BranchSchedule({ branchId, emptyLink, emptyLinkLabel }) {
  const [today] = useState(() => getCinemaLocalNow().slice(0, 10));
  const [now, setNow] = useState(getCinemaLocalNow);
  const [{ week, dayIndex }, setCalendar] = useState({ week: 0, dayIndex: 0 });
  const [search, setSearch] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const days = useMemo(() => buildUpcomingDays(DAYS_PER_WEEK, week * DAYS_PER_WEEK, today), [today, week]);
  const day = days[dayIndex];
  const { iso } = day;
  const request = useMemo(() => ({ branchId, iso, attempt }), [branchId, iso, attempt]);
  const loading = result?.request !== request;
  const error = !loading && result.error;
  const movies = loading ? [] : result.movies || [];
  const query = search.trim().toLowerCase();
  const visibleMovies = movies.filter((movie) => !query || movie.movieName?.toLowerCase().includes(query));
  const slotCount = visibleMovies.reduce((total, movie) => total + (movie.showtimes?.length || 0), 0);
  const cinemaTime = parseLocalDateTime(now);

  useEffect(() => {
    let ignore = false;
    showtimeApi.getByBranch(request.branchId, request.iso)
      .then(({ data }) => {
        if (!ignore) setResult({ request, movies: data?.result || [] });
      })
      .catch(() => {
        if (!ignore) setResult({ request, error: true });
      });
    return () => { ignore = true; };
  }, [request]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(getCinemaLocalNow()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  function changeWeek(step) {
    setCalendar((current) => ({ week: Math.max(0, current.week + step), dayIndex: 0 }));
  }

  return (
    <section className="br-schedule" aria-labelledby="br-schedule-heading">
      <div className="br-schedule-bar">
        <WeekPicker
          days={days}
          dayIndex={dayIndex}
          week={week}
          setDayIndex={(index) => setCalendar({ week, dayIndex: index })}
          changeWeek={changeWeek}
        />
        <div className="br-schedule-meta">
          <div className="br-summary" role="status">
            <strong>{day.fullLabel}</strong>
            {!loading && !error && <span>{visibleMovies.length} phim · {slotCount} suất chiếu</span>}
          </div>
          {(movies.length > 1 || search) && (
            <div className="br-search br-movie-search">
              <SearchIcon size={16} />
              <input type="text" aria-label="Tìm phim trong lịch chiếu" placeholder="Tìm phim…" value={search} onChange={(event) => setSearch(event.target.value)} />
              {search && (
                <button type="button" aria-label="Xóa tìm kiếm phim" onClick={() => setSearch('')}><XIcon size={16} /></button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <BranchMessage title="Đang tải lịch chiếu…" loading />
      ) : error ? (
        <BranchMessage title="Không tải được lịch chiếu" detail="Hãy thử tải lại lịch chiếu của ngày đã chọn." error onRetry={() => setAttempt((current) => current + 1)} />
      ) : movies.length === 0 ? (
        <BranchMessage title="Chưa có suất chiếu cho ngày này" detail="Bạn có thể chọn ngày khác trên thanh lịch.">
          <Link to={emptyLink} className="br-btn">{emptyLinkLabel}<ArrowRightIcon size={16} /></Link>
        </BranchMessage>
      ) : visibleMovies.length === 0 ? (
        <BranchMessage icon={<SearchIcon size={23} />} title="Không tìm thấy phim phù hợp" detail="Bạn có thể thử từ khóa khác hoặc xóa bộ lọc.">
          <button type="button" className="br-btn" onClick={() => setSearch('')}>Xóa bộ lọc phim</button>
        </BranchMessage>
      ) : (
        <div className="br-movie-list">
          {visibleMovies.map((movie) => <MovieScheduleCard key={movie.movieId} movie={movie} now={cinemaTime} />)}
        </div>
      )}
    </section>
  );
}

function MovieScheduleCard({ movie, now }) {
  const movieUrl = `/movie/${movie.movieId}`;
  const formats = new Map();
  const showtimes = [...(movie.showtimes || [])].sort((a, b) =>
    (parseLocalDateTime(a.startTime)?.getTime() ?? 0) -
    (parseLocalDateTime(b.startTime)?.getTime() ?? 0)
  );

  for (const showtime of showtimes) {
    const format = formatScreening(showtime.screeningFormat, showtime.roomTechnology);
    if (!formats.has(format)) formats.set(format, []);
    formats.get(format).push(showtime);
  }

  return (
    <article className="br-movie-card">
      <Link to={movieUrl} className="br-movie-poster-link" tabIndex={-1} aria-label={movie.movieName}>
        <SafeImage key={movie.thumbnailUrl} src={movie.thumbnailUrl} alt="" className="br-poster" fallback="/assets/img/empty-cinema.png" />
      </Link>
      <div className="br-movie-heading">
        {movie.ageRating && <span className={`br-age br-age--${getAgeBadgeTone(movie.ageRating)}`}>{movie.ageRating}</span>}
        <h3><Link to={movieUrl}>{movie.movieName}</Link></h3>
        <div className="br-movie-meta">
          {Boolean(movie.durationMinutes) && <span><ClockIcon size={15} />{movie.durationMinutes} phút</span>}
          {movie.language && <span><GlobeIcon size={15} />{movie.language}</span>}
        </div>
      </div>
      <div className="br-formats">
        {Array.from(formats, ([format, slots]) => (
          <div className="br-format" key={format}>
            <h4><FilmIcon size={15} />{formatRoomType(format)}</h4>
            <div className="br-slots">
              {slots.map((slot) => <ShowtimeSlot key={slot.showtimeId} slot={slot} now={now} />)}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ShowtimeSlot({ slot, now }) {
  const start = parseLocalDateTime(slot.startTime);
  const started = start && start <= now;
  const closed = slot.status && slot.status !== 'OPEN';
  const available = slot.availableSeats == null ? null : Number(slot.availableSeats);
  const hasSeatCount = Number.isFinite(available) && Number(slot.totalSeats) > 0;
  const soldOut = hasSeatCount && available <= 0;
  const lowSeats = hasSeatCount && available > 0 && available <= 12;
  const disabled = started || closed || soldOut;
  const state = started || closed ? 'closed' : soldOut ? 'soldout' : lowSeats ? 'low' : 'open';
  const statusLabel = {
    closed: started ? 'Đã qua giờ' : 'Ngừng bán',
    soldout: 'Hết ghế',
    low: `Sắp hết · ${available} ghế`,
    open: hasSeatCount ? `Còn ${available} ghế` : 'Đang mở bán',
  }[state];

  const content = (
    <>
      <span className="br-slot-time">
        <strong>{formatTime(slot.startTime)}</strong>
        {slot.endTime && <span>– {formatTime(slot.endTime)}</span>}
      </span>
      <span className="br-slot-room">{slot.roomName || 'Phòng chiếu'}</span>
      <span className="br-slot-status"><TicketIcon size={13} />{statusLabel}</span>
    </>
  );
  const className = `br-slot br-slot--${state}`;

  return disabled ? (
    <button type="button" className={className} disabled>{content}</button>
  ) : (
    <Link className={className} to={`/showtime/${slot.showtimeId}/seats`}>{content}</Link>
  );
}
