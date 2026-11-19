import { useEffect, useMemo, useState } from 'react';
import { auditLogApi } from '../../api';
import { RefreshIcon, SearchIcon } from '../../components/Common/CinemaIcons';

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('vi-VN') : '-';

const actionLabels = {
  STAFF_BOOKING_CREATED: 'Tạo đơn tại quầy',
  TICKET_CHECKED_IN: 'Check-in vé',
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

  const fetchLogs = () => {
    setLoading(true);
    auditLogApi
      .getRecent()
      .then((res) => {
        setLogs(res.data.result || []);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải nhật ký hệ thống'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (log.actorUsername || '').toLowerCase().includes(q) ||
        (log.targetType || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (actionLabels[log.action] || log.action || '').toLowerCase().includes(q)
      );
    });
  }, [logs, roleFilter, actionFilter, searchQuery]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Nhật ký hệ thống</h1>
          <p className="page-subtitle">Theo dõi các thao tác quan trọng như bán vé, hoàn tiền, check-in và cập nhật tồn kho.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshIcon size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {[
              { key: 'ALL', label: 'Tất cả vai trò', count: logs.length },
              { key: 'ADMIN', label: 'Admin', count: logs.filter((l) => l.actorRole === 'ADMIN').length },
              { key: 'MANAGER', label: 'Manager', count: logs.filter((l) => l.actorRole === 'MANAGER').length },
              { key: 'STAFF', label: 'Staff', count: logs.filter((l) => l.actorRole === 'STAFF').length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`console-status-tab ${roleFilter === tab.key ? 'is-active' : ''}`}
                onClick={() => setRoleFilter(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="console-status-count">{tab.count}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="input"
              style={{ width: 'auto', height: 38, fontSize: '0.84rem' }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="ALL">Mọi hành động</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <div style={{ position: 'relative', minWidth: 240 }}>
              <SearchIcon
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="input"
                placeholder="Tìm người thao tác, chi tiết..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Người thao tác</th>
              <th>Vai trò</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32 }}>Đang tải...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có nhật ký phù hợp</td></tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>{formatDateTime(log.createdAt)}</td>
                  <td style={{ fontWeight: 700 }}>{log.actorUsername || '-'}</td>
                  <td>
                    <span className="movie-badge">{log.actorRole || '-'}</span>
                  </td>
                  <td><span className="status-badge status--active">{actionLabels[log.action] || log.action}</span></td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {log.targetType || '-'} {log.targetId ? `#${log.targetId}` : ''}
                  </td>
                  <td>{log.details || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;

