import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { systemSettingsApi } from '../../api';

const settingLabels = {
  'booking.holdMinutes': 'Thời gian giữ ghế',
  'booking.maxTicketsPerTransaction': 'Số vé tối đa mỗi giao dịch',
  'booking.maxTicketsPerMovie': 'Số vé tối đa mỗi khách cho một phim',
  'refund.windowHours': 'Thời hạn gửi yêu cầu hoàn tiền',
  'cinema.supportEmail': 'Email hỗ trợ',
  'cinema.supportHotline': 'Hotline hỗ trợ',
};

const SystemSettingsPage = () => {
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await systemSettingsApi.getAll();
      const result = res.data.result || [];
      setSettings(result);
      setDrafts(Object.fromEntries(result.map((item) => [item.settingKey, item.settingValue || ''])));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải cấu hình hệ thống');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (setting) => {
    try {
      await systemSettingsApi.update(setting.settingKey, {
        settingValue: drafts[setting.settingKey],
        description: setting.description,
      });
      toast.success('Đã lưu cấu hình');
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Cấu hình hệ thống</h1>
          <p className="page-subtitle">Thiết lập các tham số vận hành dùng chung cho đặt vé, giữ ghế và hoàn tiền.</p>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cấu hình</th>
              <th>Giá trị</th>
              <th>Mô tả</th>
              <th style={{ width: 120 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 32 }}>Đang tải...</td></tr>
            ) : settings.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 32 }}>Chưa có cấu hình</td></tr>
            ) : (
              settings.map((setting) => (
                <tr key={setting.settingKey}>
                  <td>
                    <strong>{settingLabels[setting.settingKey] || setting.settingKey}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{setting.settingKey}</div>
                  </td>
                  <td>
                    <input
                      className="input"
                      value={drafts[setting.settingKey] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [setting.settingKey]: e.target.value }))}
                    />
                  </td>
                  <td>{setting.description || '-'}</td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSave(setting)}>
                      Lưu
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemSettingsPage;
