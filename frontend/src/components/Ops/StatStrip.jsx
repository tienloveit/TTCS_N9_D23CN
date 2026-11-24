import { Link } from 'react-router-dom';

export default function StatStrip({ items = [], loading, className = '', ...props }) {
  return (
    <div className={'o-panel o-stats ' + className} aria-busy={loading || undefined} {...props}>
      {items.map(({ label, value, note, tone, to, ariaLabel }) => {
        const content = <>
          <span className="o-stats__label">{label}</span>
          {loading ? <span className="o-skeleton" aria-label="Đang tải số liệu" role="status" /> :
            <strong className="o-stats__value" data-tone={tone}>{value ?? '—'}</strong>}
          {note && <span className="o-stats__note">{note}</span>}
        </>;
        return to ? (
          <Link key={label} className="o-stats__cell" to={to} aria-label={ariaLabel}>
            {content}<span className="o-sr-only">, mở danh sách</span>
          </Link>
        ) : <div key={label} className="o-stats__cell">{content}</div>;
      })}
    </div>
  );
}
