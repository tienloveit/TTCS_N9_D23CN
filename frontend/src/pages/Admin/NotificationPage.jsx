import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import StaffInbox from '../Staff/StaffInbox';
import { toast } from 'react-toastify';
import { notificationApi } from '../../api';
const NotificationPage = () => {
  const outlet = useOutletContext();
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
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const setUnreadCount = outlet?.setUnreadCount;
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
      if (marked.size) toast.success(`Đã đánh dấu đã đọc ${marked.size} thông báo`);
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

  return <StaffInbox filtered={filtered} unreadCount={unreadItems.length}
    tab={tab} onTab={setTab} search={searchQuery} onSearch={setSearchQuery} loading={loading}
    error={error} onRefresh={fetchNotifications} onMarkAll={markAllRead} onMarkRead={markRead}
    markingAll={markingAll} pending={pending} />;

};

export default NotificationPage;
