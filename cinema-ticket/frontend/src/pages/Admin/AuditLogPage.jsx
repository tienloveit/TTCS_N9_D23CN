import { useEffect, useState } from 'react';
import { auditLogApi } from '../../api';

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

  useEffect(() => {
    auditLogApi.getRecent()
      .then((res) => {
        setLogs(res.data.result || []);
        setError('');
      })
      .catch((err) => setError(err.response?.data?.message || 'Không thể tải nhật ký hệ thống'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Nhật ký hệ thống</h1>
          <p className="page-subtitle">Theo dõi các thao tác quan trọng như bán vé, hoàn tiền, check-in và cập nhật tồn kho.</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="admin-table-card">
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
            ) : logs.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32 }}>Chưa có nhật ký</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>{log.actorUsername || '-'}</td>
                  <td>{log.actorRole || '-'}</td>
                  <td><span className="status-badge status--active">{actionLabels[log.action] || log.action}</span></td>
                  <td>{log.targetType || '-'} {log.targetId ? `#${log.targetId}` : ''}</td>
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
