import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { systemSettingsApi } from '../../api';
import { CheckIcon, RefreshIcon } from '../../components/Common/CinemaIcons';

const settingMeta = {
  'booking.holdMinutes': { label: 'Thời gian giữ ghế', unit: 'phút', isNumeric: true },
  'booking.maxTicketsPerTransaction': { label: 'Số vé tối đa mỗi giao dịch', unit: 'vé', isNumeric: true },
  'refund.windowHours': { label: 'Thời hạn gửi yêu cầu hoàn tiền sau thanh toán', unit: 'giờ', isNumeric: true },
  'cinema.supportEmail': { label: 'Email hỗ trợ khách hàng', unit: '', isNumeric: false },
  'cinema.supportHotline': { label: 'Hotline hỗ trợ khách hàng', unit: '', isNumeric: false },
};

const SystemSettingsPage = () => {
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [savingAll, setSavingAll] = useState(false);

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

  const dirtySettings = useMemo(
    () =>
      settings.filter(
        (item) => String(drafts[item.settingKey] ?? '') !== String(item.settingValue ?? '')
      ),
    [settings, drafts]
  );

  const handleSave = async (setting) => {
    setSavingKey(setting.settingKey);
    try {
      await systemSettingsApi.update(setting.settingKey, {
        settingValue: drafts[setting.settingKey],
        description: setting.description,
      });
      toast.success(`Đã lưu "${settingMeta[setting.settingKey]?.label || setting.settingKey}"`);
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu cấu hình');
    } finally {
      setSavingKey('');
    }
  };

  const handleSaveAll = async () => {
    if (dirtySettings.length === 0 || savingAll) return;
    setSavingAll(true);
    try {
      await Promise.all(
        dirtySettings.map((setting) =>
          systemSettingsApi.update(setting.settingKey, {
            settingValue: drafts[setting.settingKey],
            description: setting.description,
          })
        )
      );
      toast.success(`Đã lưu ${dirtySettings.length} cấu hình thay đổi`);
      fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể lưu toàn bộ cấu hình');
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Cấu hình hệ thống</h1>
          <p className="page-subtitle">Thiết lập các tham số vận hành dùng chung cho đặt vé, giữ ghế và hoàn tiền.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {dirtySettings.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={savingAll}
            >
              <CheckIcon size={16} />
              <span>{savingAll ? 'Đang lưu...' : `Lưu tất cả thay đổi (${dirtySettings.length})`}</span>
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={fetchSettings} disabled={loading}>
            <RefreshIcon size={16} />
            <span>Khôi phục / Tải lại</span>
          </button>
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cấu hình</th>
              <th>Giá trị thiết lập</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th style={{ width: 130 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32 }}>Đang tải...</td></tr>
            ) : settings.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32 }}>Chưa có cấu hình</td></tr>
            ) : (
              settings.map((setting) => {
                const meta = settingMeta[setting.settingKey] || { label: setting.settingKey, unit: '', isNumeric: false };
                const isDirty = String(drafts[setting.settingKey] ?? '') !== String(setting.settingValue ?? '');
                return (
                  <tr key={setting.settingKey}>
                    <td>
                      <strong>{meta.label}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {setting.settingKey}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 260 }}>
                        <input
                          type={meta.isNumeric ? 'number' : 'text'}
                          className="input"
                          value={drafts[setting.settingKey] ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [setting.settingKey]: e.target.value }))
                          }
                        />
                        {meta.unit && (
                          <span className="movie-badge" style={{ flexShrink: 0 }}>
                            {meta.unit}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{setting.description || '-'}</td>
                    <td>
                      <span className={`status-badge ${isDirty ? 'status--pending' : 'status--active'}`}>
                        {isDirty ? 'Chưa lưu' : 'Đã đồng bộ'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
                        disabled={!isDirty || savingKey === setting.settingKey}
                        onClick={() => handleSave(setting)}
                      >
                        <CheckIcon size={14} />
                        <span>{savingKey === setting.settingKey ? 'Đang lưu...' : 'Lưu'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SystemSettingsPage;

