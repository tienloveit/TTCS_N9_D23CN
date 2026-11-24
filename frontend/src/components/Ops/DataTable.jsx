import { ChevronDownIcon } from '../Common/CinemaIcons';
import StateBlock from './StateBlock';

const ROW_CONTROL = 'a,button,input,select,textarea,label,[role="button"]';

export default function DataTable({
  caption, columns, rows = [], rowKey = (row) => row.id, state = 'ready', onRetry,
  error, empty = {}, onRowOpen, selectedKey, sort, onSortChange, stackOnMobile,
  className = '', ...props
}) {
  const loading = state === 'loading';
  return (
    <div className={'o-table-wrap ' + className} {...props}>
      <table className="o-table" data-stack={stackOnMobile || undefined} aria-busy={loading || undefined}>
        <caption className="o-sr-only">{caption}</caption>
        <thead><tr>{columns.map(({ key, header, align, width, sortable }) => {
          const current = sort?.key === key;
          const descending = current && ['desc', 'descending'].includes(sort.direction);
          const canSort = Boolean(onSortChange) && sortable !== false;
          return (
            <th scope="col" key={key} data-align={align} style={width ? { '--o-col-width': width } : undefined}
              aria-sort={current ? (descending ? 'descending' : 'ascending') : undefined}>
              {canSort ? <button className="o-table__sort" type="button"
                onClick={() => onSortChange({ key, direction: current && !descending ? 'desc' : 'asc' })}>
                {header}<ChevronDownIcon size={14} data-direction={current && !descending ? 'up' : undefined} />
              </button> : header}
            </th>
          );
        })}</tr></thead>
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, index) => (
            <tr key={index}>{columns.map(({ key }) => <td key={key}><span className="o-skeleton" /></td>)}</tr>
          )) : state === 'error' || rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="o-table__state">
              {state === 'error' ? <StateBlock state="error" title={error || 'Không tải được ' + (caption?.toLocaleLowerCase('vi') || 'dữ liệu')} onRetry={onRetry} /> :
                <StateBlock state="empty" {...empty} />}
            </td></tr>
          ) : rows.map((row, index) => {
            const id = typeof rowKey === 'function' ? rowKey(row, index) : row[rowKey];
            return (
              <tr key={id} tabIndex={onRowOpen ? 0 : undefined} data-openable={Boolean(onRowOpen) || undefined}
                aria-selected={onRowOpen ? selectedKey === id : undefined}
                onClick={onRowOpen && ((event) => { if (!event.target.closest(ROW_CONTROL)) onRowOpen(row); })}
                onKeyDown={onRowOpen && ((event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) onRowOpen(row);
                })}>
                {columns.map(({ key, header, align, render }) => (
                  <td key={key} data-align={align} data-label={typeof header === 'string' ? header : undefined}>
                    {render ? render(row, index) : row[key] ?? '—'}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
