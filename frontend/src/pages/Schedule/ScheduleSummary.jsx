/** Tiêu đề ngày và câu tóm tắt đọc lại mỗi khi đổi ngày hoặc bộ lọc. */
export default function ScheduleSummary({ day, headingId, text, note }) {
  return (
    <div className="sc-summary">
      <h2 id={headingId} className="sc-summary__title">{day.title}</h2>
      <div className="sc-summary__status" role="status" aria-live="polite">
        {text && <p className="sc-summary__text">{text}</p>}
        {note && <p className="sc-summary__note">{note}</p>}
      </div>
    </div>
  );
}
