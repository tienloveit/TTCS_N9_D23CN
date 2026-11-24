import { Link } from 'react-router-dom';
import { AlertTriangleIcon } from '../../components/Common/CinemaIcons';
import { formatTime } from '../../utils/cinemaTime';
import { getSlotState, slotFormat, slotLabel, soonMinutes } from './scheduleModel';

/** Dòng trạng thái ghế dùng chung cho cuống vé và bảng giờ. */
export function SeatStatus({ slot, className }) {
  const { state, label } = getSlotState(slot);
  return (
    <span className={className} data-state={state}>
      {state === 'low' && <AlertTriangleIcon size={14} />}
      {label}
    </span>
  );
}

/** Cuống vé: giờ chiếu cỡ lớn, đường đục lỗ, phòng và số ghế. */
export default function ShowtimeStub({ slot, now }) {
  const { state, bookable } = getSlotState(slot);
  const soon = bookable ? soonMinutes(slot, now) : null;

  const content = (
    <>
      <span className="sc-stub__time">
        <span className="sc-stub__start">{formatTime(slot.startTime)}</span>
        {slot.endTime && <span className="sc-stub__end">đến {formatTime(slot.endTime)}</span>}
      </span>
      <span className="sc-stub__meta">
        {soon != null
          ? <span className="sc-stub__soon">Sau {soon} phút</span>
          : <span className="sc-stub__room">{slot.roomName || 'Phòng chiếu'}</span>}
        <SeatStatus slot={slot} className="sc-stub__status" />
      </span>
    </>
  );

  if (!bookable) {
    // Không phải nút bị vô hiệu: trình đọc màn hình vẫn đọc tới suất hết ghế.
    return (
      <span className="sc-stub" data-state={state}>
        <span className="sr-only">{slotLabel(slot)}</span>
        <span className="sc-stub__body" aria-hidden="true">{content}</span>
      </span>
    );
  }

  return (
    <Link
      className="sc-stub sc-stub--link"
      data-state={state}
      data-soon={soon != null ? 'true' : undefined}
      to={`/showtime/${slot.showtimeId}/seats`}
    >
      {/* Tên truy cập = chữ nhìn thấy + phần đuôi ẩn, để nhãn đọc luôn chứa nhãn nhìn thấy (WCAG 2.5.3). */}
      <span className="sc-stub__body">{content}</span>
      <span className="sr-only">, {slotFormat(slot)}{soon != null ? `, ${slot.roomName || 'Phòng chiếu'}` : ''}. Chọn ghế</span>
    </Link>
  );
}
