import { Fragment, useEffect, useId, useMemo, useRef } from 'react';
import { cinemaTodayKey, formatDayMonth, formatTime, parseLocalDateTime, toCinemaDateKey } from '../../utils/cinemaTime';
import useNow from '../../utils/useNow';
import { ShowTime } from './text';
import OpsButton from './OpsButton';
import StatusBadge from './StatusBadge';
import { railPhase, railPosition, railRange, railSlotTime } from './railLayout';

const phaseLabels = { past: 'Đã chiếu', playing: 'Đang chiếu', upcoming: 'Sắp chiếu', closed: 'Đã đóng', cancelled: 'Đã hủy' };
const roomKey = (room) => String(room.roomId ?? room.id ?? [room.branchName, room.roomName].join('/'));

function Show({ show, range, now, selectedId, nextId, onSelect, isDisabled }) {
  const position = railPosition(show, range);
  if (!position) return null;
  const phase = railPhase(show, now);
  const soldOut = show.availableSeats === 0;
  const capacityKnown = show.availableSeats != null && show.totalSeats > 0;
  const sold = capacityKnown ? Math.max(0, Math.min(show.totalSeats, show.totalSeats - show.availableSeats)) : null;
  const selected = selectedId != null && String(show.showtimeId) === String(selectedId);
  const next = nextId != null && String(show.showtimeId) === String(nextId);
  const label = [show.roomName, show.movieName, formatTime(show.startTime) + ' đến ' + formatTime(show.endTime),
    capacityKnown && 'Đã bán ' + sold + ' trên ' + show.totalSeats + ' ghế', phaseLabels[phase], soldOut && 'Hết vé', next && 'Kế tiếp'].filter(Boolean).join(', ');
  const disabled = !onSelect || isDisabled?.(show);
  return (
    <button type="button" className={'o-rail__show o-rail__show--' + phase}
      style={{ '--o-start': position.startRatio, '--o-span': position.spanRatio, '--o-fill': capacityKnown ? sold / show.totalSeats : 0 }}
      aria-label={label} title={label} aria-disabled={disabled || undefined} aria-current={selected || undefined}
      onClick={() => { if (!disabled) onSelect(show); }}>
      <span className="o-rail__name">{show.movieName}</span>
      <span className="o-rail__times"><ShowTime value={show.startTime} /><span className="o-rail__end">–<ShowTime value={show.endTime} /></span></span>
      <span className="o-rail__badges">
        {['CLOSED', 'CANCELLED'].includes(show.status) && <StatusBadge kind="showtime" value={show.status} />}
        {soldOut && <StatusBadge tone="warning">Hết vé</StatusBadge>}
        {next && <StatusBadge tone="neutral">Kế tiếp</StatusBadge>}
      </span>
      {capacityKnown && <span className="o-rail__fill" aria-hidden="true" />}
    </button>
  );
}

export default function ShowtimeRail({ date = cinemaTodayKey(), showtimes = [], rooms = [], selectedId, nextId, onSelect, isDisabled, onCreate }) {
  const now = useNow(30_000);
  const skip = useId();
  const scroller = useRef(null);
  const centered = useRef('');
  const shows = useMemo(() => showtimes.filter((show) => toCinemaDateKey(show.startTime) === date &&
    parseLocalDateTime(show.endTime) > parseLocalDateTime(show.startTime)), [showtimes, date]);
  const range = railRange(date, shows);
  const ticks = Array.from({ length: range.hours }, (_, index) => new Date(range.from + index * 3_600_000));
  const groups = new Map(rooms.map((room) => [roomKey(room), { room, items: [] }]));
  for (const show of shows) {
    const key = roomKey(show);
    if (!groups.has(key)) groups.set(key, { room: show, items: [] });
    groups.get(key).items.push(show);
  }
  const lanes = [...groups.values()].sort((a, b) =>
    (a.room.branchName || '').localeCompare(b.room.branchName || '', 'vi') ||
    (a.room.roomName || '').localeCompare(b.room.roomName || '', 'vi', { numeric: true }));
  for (const lane of lanes) lane.items.sort((a, b) => parseLocalDateTime(a.startTime) - parseLocalDateTime(b.startTime));
  const nowRatio = (now - range.from) / (range.to - range.from);
  const isToday = date === cinemaTodayKey(new Date(now));
  const hasMarker = isToday && nowRatio >= 0 && nowRatio <= 1;
  useEffect(() => {
    const el = scroller.current;
    if (!el || !hasMarker || centered.current === date || !el.clientWidth) return;
    if (!lanes.length) return;
    const track = el.querySelector('.o-rail__ticks');
    el.scrollLeft = track.offsetLeft + nowRatio * track.offsetWidth - el.clientWidth / 3;
    centered.current = date;
  }, [date, nowRatio, hasMarker, lanes.length]);
  const props = { range, now, selectedId, nextId, onSelect, isDisabled };
  const multiBranch = new Set(lanes.map(({ room }) => room.branchName).filter(Boolean)).size > 1;
  const roomName = (room) => [multiBranch && room.branchName, room.roomName || room.name || 'Phòng chiếu'].filter(Boolean).join(', ');
  const mobileMarker = <p className="o-rail__mobile-now">Bây giờ {formatTime(new Date(now))}</p>;

  return (
    <div role="region" aria-label={'Suất chiếu ngày ' + formatDayMonth(date)} className="o-rail">
      <a href={'#' + skip} className="o-rail__skip">Bỏ qua lịch chiếu</a>
      <div className="o-rail__scroll" ref={scroller}>
        <div className="o-rail__grid" style={{ '--o-hours': range.hours, '--o-now': nowRatio }}>
          <span className="o-rail__room">Phòng chiếu</span>
          <div className="o-rail__ticks" aria-hidden="true">{ticks.map((tick) => <span key={+tick}>{formatTime(tick)}</span>)}
            {hasMarker && <b className="o-rail__now-time">{formatTime(new Date(now))}</b>}
          </div>
          {lanes.map(({ room, items }) => (
            <Fragment key={roomKey(room)}>
              <span className="o-rail__room">{roomName(room)}</span>
              <div className="o-rail__lane">
                {onCreate && <button type="button" className="o-rail__add" aria-label={'Thêm suất tại ' + roomName(room)}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const ratio = event.detail ? (event.clientX - rect.left) / rect.width : 0;
                    onCreate(room, railSlotTime(ratio, range));
                  }} />}
                {items.map((show) => <Show key={show.showtimeId} show={show} {...props} />)}
                {hasMarker && <span aria-hidden="true" className="o-rail__now-line" />}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="o-rail__mobile">
        {lanes.map(({ room, items }) => {
          const firstFuture = items.findIndex((s) => parseLocalDateTime(s.startTime) >= now);
          return (
            <section key={roomKey(room)} aria-label={roomName(room)}>
              <h3>{roomName(room)}</h3>
              {items.map((show, index) => <Fragment key={show.showtimeId}>
                {isToday && index === firstFuture && mobileMarker}
                <Show show={show} {...props} />
              </Fragment>)}
              {isToday && firstFuture < 0 && mobileMarker}
              {onCreate && <OpsButton onClick={() => onCreate(room, railSlotTime(0, range))}>Thêm suất chiếu</OpsButton>}
            </section>
          );
        })}
      </div>
      {!lanes.length && <p className="o-rail__empty">Chưa có suất chiếu ngày {formatDayMonth(date)}.</p>}
      <span id={skip} tabIndex={-1} />
    </div>
  );
}
