import { BellIcon, CheckIcon, CreditCardIcon, GiftIcon, BoxIcon, ListIcon, MailIcon, RefreshIcon, SearchIcon, TicketIcon } from '../../components/Common/CinemaIcons';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import { StaffPageHeading, StaffSkeleton, StaffState } from './StaffUI';
import { formatCinema } from '../../utils/cinemaTime';

const filters = [
  ['ALL', 'Tất cả', ListIcon], ['UNREAD', 'Chưa đọc', MailIcon], ['REFUND_REQUEST', 'Hoàn tiền', CreditCardIcon],
  ['SYSTEM', 'Hệ thống', BellIcon], ['LOW_STOCK', 'Tồn kho', BoxIcon],
];
const typeDetails = {
  BOOKING_STATUS: ['Đơn vé', TicketIcon],
  PROMOTION: ['Khuyến mãi', GiftIcon],
  REFUND_REQUEST: ['Hoàn tiền', CreditCardIcon],
  LOW_STOCK: ['Tồn kho', BoxIcon],
  SYSTEM: ['Hệ thống', BellIcon],
};

export default function StaffInbox({
  notifications, filtered, unreadCount, tab, onTab, search, onSearch, loading,
  error, onRefresh, onMarkAll, onMarkRead, markingAll, pending,
}) {
  return (
    <div className="staff-page">
      <StaffPageHeading icon={BellIcon} title="Thông báo vận hành" description={loading || error ? undefined : `${unreadCount} thông báo chưa đọc`}>
        <Button icon={<RefreshIcon size={16} />} onClick={onRefresh} disabled={loading || markingAll || pending.size > 0}>
          Làm mới
        </Button>
        <Button variant="primary" icon={<CheckIcon size={16} />} onClick={onMarkAll}
          disabled={loading || !unreadCount || markingAll || pending.size > 0}>
          {markingAll ? 'Đang cập nhật…' : 'Đánh dấu tất cả đã đọc'}
        </Button>
      </StaffPageHeading>
      <div className="staff-inbox-workspace">
        <div className="staff-inbox-filters staff-panel" role="group" aria-label="Lọc theo loại thông báo">
          {filters.map(([key, label, icon]) => {
            const Icon = icon;
            return (
              <button key={key} type="button" aria-pressed={tab === key} onClick={() => onTab(key)}>
                <Icon size={17} /> {label}
              </button>
            );
          })}
        </div>
        <section className="staff-panel" aria-label="Hộp thông báo" aria-busy={loading}>
          <div className="staff-inbox-toolbar">
            <h2>Hộp thông báo</h2>
            <label className="staff-inbox-search">
              <SearchIcon size={17} aria-hidden="true" />
              <input type="search" className="input" aria-label="Tìm thông báo" placeholder="Tìm tiêu đề, nội dung"
                value={search} onChange={(event) => onSearch(event.target.value)} />
            </label>
          </div>
          {error && <StaffState title={error} error onRetry={onRefresh} />}
          {loading ? <StaffSkeleton label="Đang tải thông báo" /> : filtered.length > 0 ? (
            <ul className="staff-inbox-list">
              {filtered.map((item) => {
                const [type, Icon] = typeDetails[item.type] || [item.type || 'Thông báo', BellIcon];
                return (
                  <li key={item.notificationId} className={item.read ? undefined : 'staff-inbox-unread'}>
                    <span className="staff-quick-icon"><Icon size={19} aria-hidden="true" /></span>
                    <div className="staff-inbox-copy">
                      <div className="staff-inbox-meta">
                        <span>{type}</span>
                        {item.createdAt && <time dateTime={item.createdAt}>{formatCinema(item.createdAt, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric' })}</time>}
                        {!item.read && <Badge tone="brand" dot className="staff-unread-label">Chưa đọc</Badge>}
                      </div>
                      <h2>{item.title}</h2>
                      <p>{item.message}</p>
                    </div>
                    {!item.read && (
                      <Button icon={<CheckIcon size={16} />} disabled={markingAll || pending.has(item.notificationId)}
                        aria-label={`Đánh dấu đã đọc: ${item.title}`} onClick={() => onMarkRead(item)}>
                        Đánh dấu đã đọc
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : !error && (
            <StaffState icon={BellIcon} title={notifications.length ? 'Không có thông báo phù hợp' : 'Hộp thông báo đang trống'} />
          )}
        </section>
      </div>
    </div>
  );
}
