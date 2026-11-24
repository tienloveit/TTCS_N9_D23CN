import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { systemSettingsApi } from '../../api';
import { RefreshIcon } from '../../components/Common/CinemaIcons';
import { Field, OpsButton, OpsPage, OpsPanel, StateBlock, TextInput } from '../../components/Ops';

const groups = {
  booking: 'Đặt vé', refund: 'Hoàn tiền', cinema: 'Hỗ trợ khách hàng', membership: 'Thành viên',
};
const meta = {
  'booking.holdMinutes': {
    label: 'Thời gian giữ ghế (phút)', type: 'number',
    hint: 'Áp dụng cho đơn tạo sau khi lưu. Đơn đang giữ ghế giữ nguyên hạn hiện tại.',
  },
  'booking.maxTicketsPerTransaction': { label: 'Số vé tối đa mỗi giao dịch', type: 'number' },
  'booking.maxPendingPerUser': { label: 'Số đơn tối đa đang chờ thanh toán mỗi khách', type: 'number' },
  'refund.windowHours': { label: 'Thời hạn yêu cầu hoàn tiền (giờ)', type: 'number' },
  'cinema.supportEmail': { label: 'Email hỗ trợ khách hàng', type: 'text' },
  'cinema.supportHotline': { label: 'Số điện thoại hỗ trợ khách hàng', type: 'text' },
};
const readValues = settings => Object.fromEntries(settings.map(item => [item.settingKey, item.settingValue ?? '']));

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchSettings = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await systemSettingsApi.getAll();
      const values = data.result || [];
      setSettings(values);
      setDrafts(readValues(values));
      setErrors({});
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không tải được cấu hình hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchSettings(); }, []);

  const dirty = useMemo(() => settings.filter(item =>
    String(drafts[item.settingKey] ?? '') !== String(item.settingValue ?? '')), [settings, drafts]);
  const grouped = new Map();
  for (const setting of settings) {
    const label = groups[setting.settingKey.split('.')[0]] || 'Cấu hình khác';
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(setting);
  }

  const undo = () => { setDrafts(readValues(settings)); setErrors({}); };
  const save = async (event) => {
    event.preventDefault();
    if (saving || dirty.length === 0) return;
    setSaving(true);
    const form = event.currentTarget;
    try {
      const results = await Promise.allSettled(dirty.map(setting =>
        systemSettingsApi.update(setting.settingKey, {
          settingValue: drafts[setting.settingKey],
          description: setting.description,
        })));
      const saved = new Map();
      const failed = {};
      results.forEach((result, index) => {
        const { settingKey } = dirty[index];
        if (result.status === 'fulfilled') {
          const response = result.value.data.result;
          saved.set(settingKey, response?.settingValue ?? drafts[settingKey]);
        } else {
          failed[settingKey] = result.reason?.response?.data?.message || 'Không lưu được cấu hình. Kiểm tra giá trị rồi thử lại.';
        }
      });
      const accepted = Object.fromEntries(saved);
      setSettings(current => current.map(setting => saved.has(setting.settingKey)
        ? { ...setting, settingValue: saved.get(setting.settingKey) } : setting));
      setDrafts(current => ({ ...current, ...accepted }));
      setErrors(failed);
      if (saved.size) toast.success('Đã lưu ' + saved.size + ' thay đổi');
      const firstError = Object.keys(failed)[0];
      if (firstError) requestAnimationFrame(() => form.elements.namedItem(firstError)?.focus());
    } finally {
      setSaving(false);
    }
  };

  return (
    <OpsPage title="Cấu hình hệ thống" description="Thiết lập các tham số dùng chung cho đặt vé, giữ ghế và hoàn tiền."
      actions={<OpsButton icon={<RefreshIcon size={16} />} onClick={fetchSettings}
        disabled={loading || saving || dirty.length > 0}>Tải lại</OpsButton>}>
      {loading ? <StateBlock state="loading" title="Đang tải cấu hình" /> :
        loadError ? <StateBlock state="error" title={loadError} onRetry={fetchSettings} /> :
        !settings.length ? <StateBlock title="Chưa có cấu hình" action={{ label: 'Tải lại', onClick: fetchSettings }} /> :
        <form className="o-form o-settings" onSubmit={save}>
          {[...grouped].map(([title, items]) => <OpsPanel title={title} key={title}>
            <div className="o-form">
              {items.map(({ settingKey, description }) => <Field key={settingKey}
                label={meta[settingKey]?.label || settingKey} hint={meta[settingKey]?.hint || description} error={errors[settingKey]}>
                <TextInput type={meta[settingKey]?.type || 'text'} name={settingKey} value={drafts[settingKey] ?? ''}
                  disabled={saving} onChange={event => {
                    const value = event.target.value;
                    setDrafts(current => ({ ...current, [settingKey]: value }));
                    setErrors(current => ({ ...current, [settingKey]: '' }));
                  }} />
              </Field>)}
            </div>
          </OpsPanel>)}
          {dirty.length > 0 && <div className="o-settings__save">
            <span role="status">Có {dirty.length} thay đổi chưa lưu</span>
            <div className="o-actions">
              <OpsButton disabled={saving} onClick={undo}>Hoàn tác</OpsButton>
              <OpsButton type="submit" variant="primary" loading={saving}>Lưu thay đổi</OpsButton>
            </div>
          </div>}
        </form>}
    </OpsPage>
  );
}
