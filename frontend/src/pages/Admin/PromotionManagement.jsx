import { DataTable, FilterBar, OpsButton, OpsConfirm, OpsDialog, OpsPage, OpsPanel, Segmented, StatusBadge, Field } from '../../components/Ops';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { promotionApi, branchApi } from '../../api';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from '../../components/Common/CinemaIcons';
import { formatDateTime as formatCinemaDateTime } from '../../utils/cinemaTime';

const TIER_OPTIONS = [
  { value: '', label: 'Tất cả hạng' },
  { value: 'BRONZE', label: 'Đồng (Bronze)' },
  { value: 'SILVER', label: 'Bạc (Silver)' },
  { value: 'GOLD', label: 'Vàng (Gold)' },
  { value: 'PLATINUM', label: 'Bạch Kim (Platinum)' },
];

const formatCurrency = (amount) =>
  amount != null
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(amount))
    : '—';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return formatCinemaDateTime(dateStr);
};

const toDateTimeLocal = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.slice(0, 16);
};

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, code }
  const [deleting, setDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    code: '', description: '', discountPercent: '', maxDiscount: '', minOrderAmount: '',
    minMembershipTier: '', branchId: '', startDate: '', endDate: '', usageLimit: '', active: true,
  });

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await promotionApi.getAll();
      setPromotions(res.data.result || []);
    } catch (err) {
      setLoadError(true);
      console.error('Lỗi khi tải khuyến mãi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await branchApi.getAll();
      setBranches(res.data.result || []);
    } catch (err) {
      console.error('Lỗi khi tải chi nhánh:', err);
    }
  };

  useEffect(() => { fetchPromotions(); fetchBranches(); }, []);

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        code: promo.code || '',
        description: promo.description || '',
        discountPercent: promo.discountPercent || '',
        maxDiscount: promo.maxDiscount || '',
        minOrderAmount: promo.minOrderAmount || '',
        minMembershipTier: promo.minMembershipTier || '',
        branchId: promo.branchId ? String(promo.branchId) : '',
        startDate: toDateTimeLocal(promo.startDate),
        endDate: toDateTimeLocal(promo.endDate),
        usageLimit: promo.usageLimit || '',
        active: promo.active !== false,
      });
    } else {
      setEditingPromo(null);
      setFormData({
        code: '', description: '', discountPercent: '', maxDiscount: '', minOrderAmount: '',
        minMembershipTier: '', branchId: '', startDate: '', endDate: '', usageLimit: '', active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingPromo(null); };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        discountPercent: formData.discountPercent ? Number(formData.discountPercent) : null,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : null,
        branchId: formData.branchId ? Number(formData.branchId) : null,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        minMembershipTier: formData.minMembershipTier || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };
      if (editingPromo) {
        await promotionApi.update(editingPromo.id, payload);
        toast.success(`Đã cập nhật khuyến mãi "${formData.code}"`);
      } else {
        await promotionApi.create(payload);
        toast.success(`Đã thêm khuyến mãi "${formData.code}"`);
      }
      handleCloseModal();
      fetchPromotions();
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const isExpired = (p) => p.endDate && new Date(p.endDate).getTime() < Date.now();

  const handleDelete = (id, code) => {
    setDeleteTarget({ id, code });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await promotionApi.delete(deleteTarget.id);
      toast.success(`Đã vô hiệu hóa "${deleteTarget.code}"`);
      setDeleteTarget(null);
      fetchPromotions();
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      if (statusFilter === 'ACTIVE' && (!p.active || isExpired(p))) return false;
      if (statusFilter === 'EXPIRED' && !isExpired(p)) return false;
      if (statusFilter === 'INACTIVE' && p.active) return false;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        p.code?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    });
  }, [promotions, statusFilter, searchTerm]);


  return (
    <OpsPage title="Quản lý khuyến mãi" description={<>Tổng cộng <strong>{promotions.length}</strong> mã khuyến mãi.</>} actions={<OpsButton variant="primary" icon={<PlusIcon size={18} />} onClick={() => handleOpenModal()}>
          Thêm khuyến mãi
        </OpsButton>}>

      <FilterBar search={searchTerm} onSearchChange={setSearchTerm} searchLabel="Tìm khuyến mãi" searchPlaceholder="Tìm mã khuyến mãi, mô tả..."
        filtered={Boolean(searchTerm || statusFilter !== 'ALL')} onReset={() => { setSearchTerm(''); setStatusFilter('ALL'); }} resultLabel={`${filteredPromotions.length} khuyến mãi`}>
        <Segmented label="Trạng thái" value={statusFilter} onChange={setStatusFilter} options={([
              { key: 'ALL', label: 'Tất cả', count: promotions.length },
              { key: 'ACTIVE', label: 'Đang hiệu lực', count: promotions.filter((p) => p.active && !isExpired(p)).length },
              { key: 'EXPIRED', label: 'Hết hạn', count: promotions.filter((p) => isExpired(p)).length },
              { key: 'INACTIVE', label: 'Đã tắt', count: promotions.filter((p) => !p.active).length },
            ]).map(tab => {
                return { value: tab.key, label: tab.label, count: tab.count };
              })} />
      </FilterBar>
      <OpsPanel flush title="Khuyến mãi">
        <DataTable caption="Khuyến mãi" rows={filteredPromotions} rowKey={p => p.id}
          state={loading ? 'loading' : loadError ? 'error' : 'ready'} onRetry={fetchPromotions}
          empty={{ title: 'Không có khuyến mãi phù hợp', action: { label: 'Làm mới', onClick: fetchPromotions } }}
          columns={[
            { key: 'index', header: "#", render: (p, idx) => idx + 1 },
            { key: 'ma', header: "Mã", render: p => <> <div>
                      <strong className="o-code">{p.code}</strong>
                      {p.description && <div className="o-subline">{p.description}</div>}
                    </div> </> },
            { key: 'giam', header: "Giảm", render: p => <> {p.discountPercent}% </> },
            { key: 'giam_toi_da', header: "Giảm tối đa", render: p => formatCurrency(p.maxDiscount) },
            { key: 'hang_toi_thieu', header: "Hạng tối thiểu", render: p => p.minMembershipTier ? TIER_OPTIONS.find(t => t.value === p.minMembershipTier)?.label || p.minMembershipTier : 'Tất cả' },
            { key: 'chi_nhanh', header: "Chi nhánh", render: p => p.branchName || 'Toàn hệ thống' },
            { key: 'da_dung', header: "Đã dùng", render: p => <> <div>
                      <strong className="o-table-value">
                        {p.usedCount || 0}{p.usageLimit ? ` / ${p.usageLimit}` : ''}
                      </strong>
                      {p.usageLimit > 0 && <progress className="o-progress"
                        aria-label={'Lượt đã dùng mã ' + p.code} max={p.usageLimit} value={p.usedCount || 0} />}
                    </div> </> },
            { key: 'hieu_luc', header: "Hiệu lực", render: p => <> <div>{formatDate(p.startDate)}</div>
                    <small className="o-subline">Đến {formatDate(p.endDate)}</small> </> },
            { key: 'trang_thai', header: "Trạng thái", render: p => <> <StatusBadge tone={!p.active ? 'neutral' : isExpired(p) ? 'warning' : 'success'}>
                      {!p.active ? 'Đã tắt' : isExpired(p) ? 'Hết hạn' : 'Hoạt động'}
                    </StatusBadge> </> },
            { key: 'hanh_dong', header: "Hành động", render: p => <> <div className="o-actions">
                      <OpsButton
                        variant="ghost"
                        size="sm"
                        title="Sửa khuyến mãi"
                        aria-label={`Sửa mã ${p.code}`}
                        icon={<EditIcon size={15} />}
                        onClick={() => handleOpenModal(p)}
                      />
                      <OpsButton
                        variant="ghost-danger"
                        size="sm"
                        title="Tắt khuyến mãi"
                        aria-label={`Tắt mã ${p.code}`}
                        icon={<TrashIcon size={15} />}
                        onClick={() => handleDelete(p.id, p.code)}
                      />
                    </div> </> }
          ]} />
      </OpsPanel>

      {isModalOpen && (
        <OpsDialog open title={editingPromo ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi mới'} onClose={handleCloseModal} disabled={saving} size="md" footer={<><OpsButton disabled={saving} onClick={handleCloseModal}>Hủy</OpsButton>
                <OpsButton disabled={saving} type="submit" form="o-promo-form" variant="primary">
                  {editingPromo ? 'Lưu khuyến mãi' : 'Thêm khuyến mãi'}
                </OpsButton></>}>

            <form id="o-promo-form" onSubmit={handleSubmit} className="o-form-grid">
              <div className={`o-field${editingPromo ? ' o-form-grid__wide' : ''}`}>
                <label className="o-field__label" htmlFor="o-code">Mã khuyến mãi</label>
                <input id="o-code" type="text" name="code" className="o-input" value={formData.code} onChange={handleInputChange}
                  required disabled={!!editingPromo} placeholder="Ví dụ  SUMMER2026" />
              </div>

              <Field label="Giảm giá (%)">
                <input id="promo-percent" type="number" name="discountPercent" className="o-input" value={formData.discountPercent}
                  onChange={handleInputChange} required min="1" max="100" placeholder="Ví dụ  10" />
              </Field>

              <Field label="Mô tả" className="o-form-grid__wide">
                <input id="promo-description" type="text" name="description" className="o-input" value={formData.description}
                  onChange={handleInputChange} placeholder="Mô tả ngắn cho khuyến mãi..." />
              </Field>

              <Field label="Giảm tối đa (VNĐ)">
                <input id="promo-max" type="number" name="maxDiscount" className="o-input" value={formData.maxDiscount}
                  onChange={handleInputChange} min="0" placeholder="Ví dụ  50000 (để trống = không giới hạn)" />
              </Field>

              <Field label="Đơn tối thiểu (VNĐ)">
                <input id="promo-min-order" type="number" name="minOrderAmount" className="o-input" value={formData.minOrderAmount}
                  onChange={handleInputChange} min="0" placeholder="Ví dụ  100000" />
              </Field>

              <Field label="Hạng thành viên tối thiểu">
                <select id="promo-tier" name="minMembershipTier" className="o-input" value={formData.minMembershipTier} onChange={handleInputChange}>
                  {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <Field label="Chi nhánh áp dụng">
                <select id="promo-branch" name="branchId" className="o-input" value={formData.branchId} onChange={handleInputChange}>
                  <option value="">Toàn hệ thống</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </Field>

              <Field label="Ngày bắt đầu">
                <input id="promo-start" type="datetime-local" name="startDate" className="o-input" value={formData.startDate} onChange={handleInputChange} />
              </Field>

              <Field label="Ngày kết thúc">
                <input id="promo-end" type="datetime-local" name="endDate" className="o-input" value={formData.endDate} onChange={handleInputChange} />
              </Field>

              <Field label="Giới hạn lượt dùng">
                <input id="promo-limit" type="number" name="usageLimit" className="o-input" value={formData.usageLimit}
                  onChange={handleInputChange} min="0" placeholder="Để trống = không giới hạn" />
              </Field>

              <div className="o-field o-form-align-end">
                <label className="o-actions">
                  <input type="checkbox" name="active" checked={formData.active} onChange={handleInputChange} />
                  Đang hoạt động
                </label>
              </div>


            </form>
          </OpsDialog>
      )}

      <OpsConfirm
        open={Boolean(deleteTarget)}
        title="Tắt khuyến mãi"
        message={`Tắt mã "${deleteTarget?.code}"? Khách sẽ không dùng được mã này nữa.`}
        confirmText="Tắt mã"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </OpsPage>
  );
};

export default PromotionManagement;
