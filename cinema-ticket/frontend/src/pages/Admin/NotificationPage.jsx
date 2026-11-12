import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { notificationApi } from '../../api';
import { CheckIcon, RefreshIcon, SearchIcon } from '../../components/Common/CinemaIcons';

const typeLabels = {
  BOOKING_STATUS: 'Đơn vé',
  PROMOTION: 'Khuyến mãi',
  REFUND_REQUEST: 'Hoàn tiền',
  LOW_STOCK: 'Tồn kho',
  SYSTEM: 'Hệ thống',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll();
      setNotifications(res.data.result || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (notification) => {
    if (notification.read) return;
    try {
      await notificationApi.markRead(notification.notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.notificationId === notification.notificationId ? { ...item, read: true } : item
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đánh dấu đã đọc');
    }
  };

  const unreadItems = useMemo(() => notifications.filter((n) => !n.read), [notifications]);

  const markAllRead = async () => {
    if (unreadItems.length === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await Promise.all(unreadItems.map((n) => notificationApi.markRead(n.notificationId)));
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      toast.success(`Đã đánh dấu đọc ${unreadItems.length} thông báo`);
    } catch {
      toast.error('Không thể đánh dấu tất cả đã đọc');
    } finally {
      setMarkingAll(false);
    }
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (tab === 'UNREAD' && n.read) return false;
      if (tab === 'REFUND_REQUEST' && n.type !== 'REFUND_REQUEST') return false;
      if (tab === 'LOW_STOCK' && n.type !== 'LOW_STOCK') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q)
      );
    });
  }, [notifications, tab, searchQuery]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Thông báo vận hành</h1>
          <p className="page-subtitle">Cảnh báo hoàn tiền, tồn kho sắp hết và thông báo hệ thống.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {unreadItems.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={markAllRead}
              disabled={markingAll}
            >
              <CheckIcon size={16} />
              <span>{markingAll ? 'Đang xử lý...' : `Đánh dấu tất cả đã đọc (${unreadItems.length})`}</span>
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={fetchNotifications} disabled={loading}>
            <RefreshIcon size={16} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {[
              { key: 'ALL', label: 'Tất cả', count: notifications.length },
              { key: 'UNREAD', label: 'Chưa đọc', count: unreadItems.length },
              {
                key: 'REFUND_REQUEST',
                label: 'Hoàn tiền',
                count: notifications.filter((n) => n.type === 'REFUND_REQUEST').length,
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`console-status-tab ${tab === item.key ? 'is-active' : ''}`}
                onClick={() => setTab(item.key)}
              >
                <span>{item.label}</span>
                <span className="console-status-count">{item.count}</span>
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: 250 }}>
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
              placeholder="Tìm tiêu đề, nội dung thông báo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Loại</th>
              <th>Tiêu đề</th>
              <th>Nội dung</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32 }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có thông báo phù hợp</td></tr>
            ) : filtered.map((notification) => (
              <tr
                key={notification.notificationId}
                style={{
                  fontWeight: notification.read ? 400 : 700,
                  background: notification.read ? undefined : 'rgba(7, 86, 166, 0.03)',
                }}
              >
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>{formatDateTime(notification.createdAt)}</td>
                <td>
                  <span className="movie-badge">{typeLabels[notification.type] || notification.type}</span>
                </td>
                <td>{notification.title}</td>
                <td>{notification.message}</td>
                <td>
                  <span className={`status-badge ${notification.read ? 'status--inactive' : 'status--pending'}`}>
                    {notification.read ? 'Đã đọc' : 'Mới'}
                  </span>
                </td>
                <td>
                  {!notification.read && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => markRead(notification)}>
                      <CheckIcon size={14} />
                      <span>Đánh dấu đọc</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotificationPage;

