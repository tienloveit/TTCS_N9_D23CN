import { BellIcon, CheckIcon, CreditCardIcon, GiftIcon, BoxIcon, TicketIcon } from '../../components/Common/CinemaIcons';
import { DateLabel, FilterBar, OpsButton, OpsPage, OpsPanel, Segmented, ShowTime, StateBlock } from '../../components/Ops';

const filters = [
  ['ALL', 'Tất cả'], ['UNREAD', 'Chưa đọc'], ['REFUND_REQUEST', 'Hoàn tiền'],
  ['SYSTEM', 'Hệ thống'], ['LOW_STOCK', 'Tồn kho'],
].map(([value, label]) => ({ value, label }));
const typeDetails = {
  BOOKING_STATUS: ['Đơn vé', TicketIcon],
  PROMOTION: ['Khuyến mãi', GiftIcon],
  REFUND_REQUEST: ['Hoàn tiền', CreditCardIcon],
  LOW_STOCK: ['Tồn kho', BoxIcon],
  SYSTEM: ['Hệ thống', BellIcon],
};

export default function StaffInbox({
  filtered, unreadCount, tab, onTab, search, onSearch, loading,
  error, onRefresh, onMarkAll, onMarkRead, markingAll, pending,
}) {
  const reset = () => { onTab('ALL'); onSearch(''); };
  const hasFilter = tab !== 'ALL' || Boolean(search);
  return (
    <OpsPage title="Thông báo vận hành" description={loading || error ? undefined : unreadCount + ' thông báo chưa đọc'}
      actions={<>
        <OpsButton onClick={onRefresh} disabled={loading || markingAll || pending.size > 0}>Làm mới</OpsButton>
        <OpsButton variant="primary" icon={<CheckIcon size={16} />} onClick={onMarkAll}
          loading={markingAll} disabled={loading || !unreadCount || pending.size > 0}>Đánh dấu tất cả đã đọc</OpsButton>
      </>}>
      <FilterBar search={search} onSearchChange={onSearch} searchLabel="Tìm thông báo" searchPlaceholder="Tìm tiêu đề, nội dung"
        filtered={hasFilter} onReset={reset}>
        <Segmented label="Loại thông báo" options={filters} value={tab} onChange={onTab} />
      </FilterBar>
      <OpsPanel title="Hộp thông báo" flush aria-busy={loading}>
        {loading ? <StateBlock state="loading" title="Đang tải thông báo" /> :
          error ? <StateBlock state="error" title={error} onRetry={onRefresh} /> :
          filtered.length === 0 ? <StateBlock icon={BellIcon}
            title={hasFilter ? 'Không có thông báo phù hợp' : 'Hộp thông báo đang trống'}
            action={hasFilter ? { label: 'Xóa bộ lọc', onClick: reset } : { label: 'Làm mới', onClick: onRefresh }} /> : (
          <ul className="o-inbox">
            {filtered.map(item => {
              const [type, Icon] = typeDetails[item.type] || [item.type || 'Thông báo', BellIcon];
              return (
                <li key={item.notificationId} data-unread={!item.read || undefined}>
                  <Icon size={20} aria-hidden="true" />
                  <div className="o-inbox__copy">
                    <div className="o-actions o-inbox__meta">
                      <span>{type}</span>
                      {item.createdAt && <><DateLabel value={item.createdAt} /> <ShowTime value={item.createdAt} /></>}
                      {!item.read && <span className="o-inbox__unread">Chưa đọc</span>}
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.message}</p>
                  </div>
                  {!item.read && <OpsButton disabled={markingAll || pending.has(item.notificationId)}
                    aria-label={'Đánh dấu đã đọc: ' + item.title} onClick={() => onMarkRead(item)}>Đánh dấu đã đọc</OpsButton>}
                </li>
              );
            })}
          </ul>
        )}
      </OpsPanel>
    </OpsPage>
  );
}
