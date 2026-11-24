import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '../../components/Common/CinemaIcons';
import { formatTime } from '../../utils/cinemaTime';
import { formatMoney } from '../../utils/opsFormat';
import { AgeBadge } from './MovieSchedule';
import { SeatStatus } from './ShowtimeStub';
import { getSlotState, rowLabel, slotFormat, soonMinutes, toTimeline } from './scheduleModel';

function TimeRow({ slot, now }) {
  const { state, bookable } = getSlotState(slot);
  const soon = bookable ? soonMinutes(slot, now) : null;
  const price = slot.ticketPrice != null && slot.ticketPrice !== '' ? formatMoney(slot.ticketPrice) : null;

  const content = (
    <>
      <span className="sc-row__time">{formatTime(slot.startTime)}</span>
      <span className="sc-row__main">
        <span className="sc-row__title">{slot.movie.movieName}</span>
        <span className="sc-row__meta">
          <AgeBadge rating={slot.movie.ageRating} describe={false} />
          <span>{slotFormat(slot)}</span>
          <span>{slot.roomName || 'Phòng chiếu'}</span>
          {soon != null && <span className="sc-row__soon">Bắt đầu sau {soon} phút</span>}
        </span>
      </span>
      <SeatStatus slot={slot} className="sc-row__seats" />
      <span className="sc-row__price">{bookable ? price : null}</span>
      <span className="sc-row__go">{bookable && <ChevronRightIcon size={18} />}</span>
    </>
  );

  if (!bookable) {
    return (
      <div className="sc-row" data-state={state}>
        <span className="sr-only">{rowLabel(slot)}</span>
        <span className="sc-row__grid" aria-hidden="true">{content}</span>
      </div>
    );
  }

  return (
    <Link className="sc-row sc-row--link" data-state={state} to={`/showtime/${slot.showtimeId}/seats`}>
      {/* Tên truy cập là chính chữ của dòng, thêm đuôi "Chọn ghế". */}
      <span className="sc-row__grid">{content}</span>
      <span className="sr-only">. Chọn ghế</span>
    </Link>
  );
}

/** Chế độ "Theo giờ": mọi suất của ngày xếp theo giờ, như bảng giờ ở sảnh rạp. */
export default function TimeBoard({ movies, now }) {
  return (
    <ol className="sc-board">
      {toTimeline(movies).map((slot) => (
        <li key={slot.showtimeId} className="sc-board__item"><TimeRow slot={slot} now={now} /></li>
      ))}
    </ol>
  );
}
