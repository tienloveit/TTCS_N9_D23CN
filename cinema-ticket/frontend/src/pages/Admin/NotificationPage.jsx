import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { notificationApi } from '../../api';

const typeLabels = {
  BOOKING_STATUS: 'Đơn vé',
  PROMOTION: 'Khuyến mãi',
  STAFF_SCHEDULE: 'Lịch trực',
  SHIFT_START: 'Đến ca',
  SHIFT_END: 'Kết thúc ca',
  REFUND_REQUEST: 'Hoàn tiền',
  LOW_STOCK: 'Tồn kho',
  MISSED_SHIFT: 'Ca làm',
  SYSTEM: 'Hệ thống',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const NotificationPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Thông báo</h1>
          <p className="page-subtitle">Cảnh báo hoàn tiền, tồn kho sắp hết và lịch trực chưa mở ca.</p>
        </div>
      </div>

      <div className="admin-table-card">
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
            ) : notifications.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32 }}>Chưa có thông báo</td></tr>
            ) : notifications.map((notification) => (
              <tr key={notification.notificationId} style={{ fontWeight: notification.read ? 400 : 700 }}>
                <td>{formatDateTime(notification.createdAt)}</td>
                <td>{typeLabels[notification.type] || notification.type}</td>
                <td>{notification.title}</td>
                <td>{notification.message}</td>
                <td>
                  <span className={`status-badge ${notification.read ? 'status--inactive' : 'status--pending'}`}>
                    {notification.read ? 'Đã đọc' : 'Mới'}
                  </span>
                </td>
                <td>
                  {!notification.read && (
                    <button className="btn btn-primary btn-sm" onClick={() => markRead(notification)}>
                      Đánh dấu đọc
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
