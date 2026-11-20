import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import StaffInbox from '../Staff/StaffInbox';
import { toast } from 'react-toastify';
import { notificationApi } from '../../api';
import { CheckIcon, RefreshIcon, SearchIcon } from '../../components/Common/CinemaIcons';
import { formatCinema } from '../../utils/cinemaTime';

const typeLabels = {
  BOOKING_STATUS: 'Đơn vé',
  PROMOTION: 'Khuyến mãi',
  REFUND_REQUEST: 'Hoàn tiền',
  LOW_STOCK: 'Tồn kho',
  SYSTEM: 'Hệ thống',
};

const formatDateTime = (value) => formatCinema(value, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric' }, '-');

const NotificationPage = ({ staff = false }) => {
  const staffOutlet = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(() => new Set());
  const pendingReads = useRef(new Set());
  const markingBatch = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationApi.getAll();
      setNotifications(res.data.result || []);
    } catch (err) {
      const message = err.response?.data?.message || 'Không thể tải thông báo';
      if (staff) setError(message);
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [staff]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (notification) => {
    const id = notification.notificationId;
    if (notification.read || markingBatch.current || pendingReads.current.has(id)) return;
    pendingReads.current.add(id);
    setPending(new Set(pendingReads.current));
    try {
      await notificationApi.markRead(notification.notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.notificationId === notification.notificationId ? { ...item, read: true } : item
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đánh dấu đã đọc');
    } finally {
      pendingReads.current.delete(id);
      setPending(new Set(pendingReads.current));
    }
  };

  const unreadItems = useMemo(() => notifications.filter((n) => !n.read), [notifications]);

  const setUnreadCount = staff ? staffOutlet?.setUnreadCount : undefined;
  useEffect(() => {
    if (!loading && !error) setUnreadCount?.(unreadItems.length);
  }, [error, loading, setUnreadCount, unreadItems.length]);

  const markAllRead = async () => {
    if (!unreadItems.length || markingBatch.current || pendingReads.current.size) return;
    markingBatch.current = true;
    setMarkingAll(true);
    try {
      const results = await Promise.allSettled(unreadItems.map((n) => notificationApi.markRead(n.notificationId)));
      const marked = new Set(unreadItems.filter((_, index) => results[index].status === 'fulfilled').map((n) => n.notificationId));
      setNotifications((prev) => prev.map((item) => marked.has(item.notificationId) ? { ...item, read: true } : item));
      if (marked.size) toast.success(`Đã đánh dấu đọc ${marked.size} thông báo`);
      if (marked.size < unreadItems.length) toast.error('Một số thông báo chưa được cập nhật. Vui lòng thử lại.');
    } finally {
      markingBatch.current = false;
      setMarkingAll(false);
    }
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (tab === 'UNREAD' && n.read) return false;
      if (tab === 'REFUND_REQUEST' && n.type !== 'REFUND_REQUEST') return false;
      if (tab === 'LOW_STOCK' && n.type !== 'LOW_STOCK') return false;
      if (tab === 'SYSTEM' && n.type !== 'SYSTEM') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (n.title || '').toLowerCase().includes(q) ||
        (n.message || '').toLowerCase().includes(q)
      );
    });
  }, [notifications, tab, searchQuery]);

  if (staff) return <StaffInbox notifications={notifications} filtered={filtered} unreadCount={unreadItems.length}
    tab={tab} onTab={setTab} search={searchQuery} onSearch={setSearchQuery} loading={loading}
    error={error} onRefresh={fetchNotifications} onMarkAll={markAllRead} onMarkRead={markRead}
    markingAll={markingAll} pending={pending} />;

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

