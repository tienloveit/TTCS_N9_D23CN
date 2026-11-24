import { useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Dải 14 ngày cuộn ngang; ngày đang chọn luôn được cuộn vào giữa. */
export default function DayStrip({ days, value, onChange }) {
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [value]);

  return (
    <div role="group" aria-label="Chọn ngày chiếu">
      <ul className="sc-days">
        {days.map((day) => {
          const selected = day.key === value;
          return (
            <li className="sc-days__item" key={day.key}>
              <button
                ref={selected ? selectedRef : undefined}
                type="button"
                className="sc-day"
                aria-pressed={selected}
                aria-current={day.isToday ? 'date' : undefined}
                onClick={() => onChange(day.key)}
              >
                {/* Tên truy cập = chữ nhìn thấy + ngày đầy đủ: "T6 27, Thứ sáu, 27/11/2026". */}
                <span className="sc-day__name">{day.relative}</span>{' '}
                <span className="sc-day__num">{day.dayNum}</span>
                <span className="sr-only">, {day.fullLabel}</span>
              </button>
              {day.monthLabel && <span className="sc-days__month" aria-hidden="true">{day.monthLabel}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
