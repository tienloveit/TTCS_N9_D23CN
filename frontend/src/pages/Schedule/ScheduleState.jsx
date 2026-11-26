import { AlertCircleIcon } from '../../components/Common/CinemaIcons';

/** Trạng thái ngoài dữ liệu: lỗi dùng role="alert", rỗng dùng role="status", luôn kèm hành động. */
export default function ScheduleState({ icon, title, detail, error = false, children }) {
  return (
    <div className="sc-state" role={error ? 'alert' : 'status'}>
      <span className="sc-state__icon" data-tone={error ? 'danger' : undefined}>
        {error ? <AlertCircleIcon size={24} /> : icon}
      </span>
      <h3 className="sc-state__title">{title}</h3>
      {detail && <p className="sc-state__detail">{detail}</p>}
      {children && <div className="sc-state__actions">{children}</div>}
    </div>
  );
}

/** Ba hàng phim giả cùng kích thước thật trong lúc tải. */
export function ScheduleSkeleton({ label }) {
  return (
    <div className="sc-movies" aria-busy="true">
      {label && <span className="sr-only" role="status">{label}</span>}
      {[0, 1, 2].map((index) => (
        <div className="sc-movie" key={index} aria-hidden="true">
          <span className="sc-skeleton sc-skeleton--poster" />
          <span className="sc-movie__body">
            <span className="sc-skeleton sc-skeleton--heading" />
            <span className="sc-skeleton sc-skeleton--line" />
            <span className="sc-stubs">
              <span className="sc-skeleton sc-skeleton--stub" />
              <span className="sc-skeleton sc-skeleton--stub" />
              <span className="sc-skeleton sc-skeleton--stub" />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
