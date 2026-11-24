import { useEffect, useMemo, useState } from 'react';
import { auditLogApi } from '../../api';
import { Code, DataTable, DateLabel, Field, FilterBar, OpsButton, OpsDrawer,
  OpsPage, OpsPanel, Segmented, Select, ShowTime, StatusBadge } from '../../components/Ops';
import { RefreshIcon } from '../../components/Common/CinemaIcons';

const roleLabels = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', STAFF: 'Nhân viên' };

const actionLabels = {
  STAFF_BOOKING_CREATED: 'Tạo đơn tại quầy',
  TICKET_CHECKED_IN: 'Soát vé',
  REFUND_APPROVED: 'Duyệt hoàn tiền',
  REFUND_REJECTED: 'Từ chối hoàn tiền',
  FOOD_CREATED: 'Tạo sản phẩm',
  FOOD_UPDATED: 'Cập nhật sản phẩm',
  FOOD_DISABLED: 'Ngừng bán sản phẩm',
  SYSTEM_SETTING_UPDATED: 'Cập nhật cấu hình',
};

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadCount, setReloadCount] = useState(0);
  const [detail, setDetail] = useState(null);

  const reloadLogs = () => {
    setLoading(true);
    setReloadCount((count) => count + 1);
  };

  useEffect(() => {
    let active = true;

    auditLogApi
      .getRecent()
      .then((res) => {
        if (!active) return;
        setLogs(res.data.result || []);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Không thể tải nhật ký hệ thống');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadCount]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (log.actorUsername || '').toLowerCase().includes(q) ||
        (log.targetType || '').toLowerCase().includes(q) ||
        (typeof log.details === 'string' ? log.details : JSON.stringify(log.details || '')).toLowerCase().includes(q) ||
        (actionLabels[log.action] || log.action || '').toLowerCase().includes(q)
      );
    });
  }, [logs, roleFilter, actionFilter, searchQuery]);

  const reset = () => { setRoleFilter('ALL'); setActionFilter('ALL'); setSearchQuery(''); };
  const formattedDetail = value => {
    if (value == null) return 'Không có nội dung chi tiết';
    if (typeof value !== 'string') return JSON.stringify(value, null, 2);
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  };
  const columns = [
    { key: 'createdAt', header: 'Thời gian', render: log => <><DateLabel value={log.createdAt} /> <ShowTime value={log.createdAt} /></> },
    { key: 'actorUsername', header: 'Người thao tác' },
    { key: 'role', header: 'Vai trò', render: log => <StatusBadge>{roleLabels[log.actorRole] || log.actorRole || '—'}</StatusBadge> },
    { key: 'action', header: 'Hành động', render: log => actionLabels[log.action] || log.action },
    { key: 'target', header: 'Đối tượng', render: log => <Code>{log.targetType || '—'}{log.targetId ? ' #' + log.targetId : ''}</Code> },
    { key: 'details', header: 'Chi tiết', render: log => <OpsButton onClick={() => setDetail(log)}>Xem chi tiết</OpsButton> },
  ];
  return (
    <OpsPage title="Nhật ký hệ thống" description="Theo dõi thao tác bán vé, hoàn tiền, soát vé và cập nhật tồn kho."
      actions={<OpsButton icon={<RefreshIcon size={16} />} onClick={reloadLogs} disabled={loading}>Làm mới</OpsButton>}>
      <FilterBar search={searchQuery} onSearchChange={setSearchQuery} searchLabel="Tìm người thao tác hoặc chi tiết"
        filtered={Boolean(searchQuery || roleFilter !== 'ALL' || actionFilter !== 'ALL')} onReset={reset}
        resultLabel={filteredLogs.length + ' sự kiện'}>
        <Segmented label="Vai trò" value={roleFilter} onChange={setRoleFilter}
          options={[{ value: 'ALL', label: 'Tất cả vai trò', count: logs.length },
            ...Object.entries(roleLabels).map(([value, label]) => ({ value, label, count: logs.filter(log => log.actorRole === value).length }))]} />
        <Field label="Hành động"><Select value={actionFilter} onChange={event => setActionFilter(event.target.value)}>
          <option value="ALL">Mọi hành động</option>
          {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select></Field>
      </FilterBar>
      <OpsPanel title="Hoạt động gần đây" flush>
        <DataTable caption="Nhật ký hệ thống" columns={columns} rows={filteredLogs} rowKey="id" stackOnMobile
          state={loading ? 'loading' : error ? 'error' : 'ready'} error={error} onRetry={reloadLogs}
          onRowOpen={setDetail} selectedKey={detail?.id}
          empty={{ title: 'Không có nhật ký phù hợp', action: { label: 'Xóa bộ lọc', onClick: reset } }} />
      </OpsPanel>
      {detail && <OpsDrawer open title={actionLabels[detail.action] || detail.action || 'Chi tiết nhật ký'} onClose={() => setDetail(null)}>
        <dl className="o-facts">
          <div><dt>Người thao tác</dt><dd>{detail.actorUsername || '—'}</dd></div>
          <div><dt>Thời gian</dt><dd><DateLabel value={detail.createdAt} /> <ShowTime value={detail.createdAt} /></dd></div>
          <div><dt>Đối tượng</dt><dd><Code>{detail.targetType || '—'} {detail.targetId}</Code></dd></div>
        </dl>
        <pre className="o-json">{formattedDetail(detail.details)}</pre>
      </OpsDrawer>}
    </OpsPage>
  );
};

export default AuditLogPage;
