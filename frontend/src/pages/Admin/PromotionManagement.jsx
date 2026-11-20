import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { promotionApi, branchApi } from '../../api';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import useModalDialog from '../../components/Common/useModalDialog';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, code }
  const [deleting, setDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialog = useModalDialog(isModalOpen, () => handleCloseModal());
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    code: '', description: '', discountPercent: '', maxDiscount: '', minOrderAmount: '',
    minMembershipTier: '', branchId: '', startDate: '', endDate: '', usageLimit: '', active: true,
  });

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const res = await promotionApi.getAll();
      setPromotions(res.data.result || []);
    } catch (err) {
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
        toast.success(`Cập nhật khuyến mãi "${formData.code}" thành công!`);
      } else {
        await promotionApi.create(payload);
        toast.success(`Thêm khuyến mãi "${formData.code}" thành công!`);
      }
      handleCloseModal();
      fetchPromotions();
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
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
      toast.success(`Đã vô hiệu hóa "${deleteTarget.code}"!`);
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

  if (loading && !isModalOpen) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="admin-promotions">
      <div className="page-header page-header--split">
        <div>
          <h1 className="page-title">Quản lý khuyến mãi</h1>
          <p className="page-subtitle">Tổng cộng <strong>{promotions.length}</strong> mã khuyến mãi.</p>
        </div>
        <Button variant="primary" icon={<PlusIcon size={18} />} onClick={() => handleOpenModal()}>
          Thêm khuyến mãi
        </Button>
      </div>

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {[
              { key: 'ALL', label: 'Tất cả', count: promotions.length },
              { key: 'ACTIVE', label: 'Đang hiệu lực', count: promotions.filter((p) => p.active && !isExpired(p)).length },
              { key: 'EXPIRED', label: 'Hết hạn', count: promotions.filter((p) => isExpired(p)).length },
              { key: 'INACTIVE', label: 'Đã tắt', count: promotions.filter((p) => !p.active).length },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`console-status-tab ${statusFilter === tab.key ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                <span>{tab.label}</span>
                <span className="console-status-count">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="admin-search">
            <SearchIcon size={16} className="input-leading-icon" aria-hidden="true" />
            <input
              type="search"
              className="input input-sm"
              placeholder="Tìm mã khuyến mãi, mô tả..."
              aria-label="Tìm khuyến mãi"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-index">#</th>
              <th>Mã</th>
              <th>Giảm</th>
              <th>Giảm tối đa</th>
              <th>Hạng tối thiểu</th>
              <th>Chi nhánh</th>
              <th>Đã dùng</th>
              <th>Hiệu lực</th>
              <th>Trạng thái</th>
              <th className="col-actions">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredPromotions.length === 0 ? (
              <tr><td colSpan="10" className="admin-table-empty">
                {searchTerm ? 'Không tìm thấy mã phù hợp. Thử từ khóa khác.' : 'Chưa có mã khuyến mãi. Bấm “Thêm khuyến mãi” để tạo mã đầu tiên.'}
              </td></tr>
            ) : (
              filteredPromotions.map((p, idx) => (
                <tr key={p.id || idx}>
                  <td className="cell-index">{idx + 1}</td>
                  <td>
                    <div>
                      <strong className="promo-code">{p.code}</strong>
                      {p.description && <div className="cell-subtext">{p.description}</div>}
                    </div>
                  </td>
                  <td className="cell-strong">{p.discountPercent}%</td>
                  <td>{formatCurrency(p.maxDiscount)}</td>
                  <td>{p.minMembershipTier ? TIER_OPTIONS.find(t => t.value === p.minMembershipTier)?.label || p.minMembershipTier : 'Tất cả'}</td>
                  <td>{p.branchName || 'Toàn hệ thống'}</td>
                  <td>
                    <div>
                      <strong className="cell-small">
                        {p.usedCount || 0}{p.usageLimit ? ` / ${p.usageLimit}` : ''}
                      </strong>
                      {p.usageLimit > 0 && (
                        <div className="mini-progress-wrap">
                          <div className="mini-progress-track">
                            <div
                              className={`mini-progress-fill ${
                                (p.usedCount || 0) >= p.usageLimit ? 'is-danger' : ''
                              }`}
                              style={{ width: `${Math.min(100, ((p.usedCount || 0) / p.usageLimit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="cell-small cell-nowrap">
                    <div>{formatDate(p.startDate)}</div>
                    <div>→ {formatDate(p.endDate)}</div>
                  </td>
                  <td>
                    <Badge tone={!p.active ? 'neutral' : isExpired(p) ? 'warning' : 'success'} dot>
                      {!p.active ? 'Đã tắt' : isExpired(p) ? 'Hết hạn' : 'Hoạt động'}
                    </Badge>
                  </td>
                  <td>
                    <div className="action-btns">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Sửa khuyến mãi"
                        aria-label={`Sửa mã ${p.code}`}
                        icon={<EditIcon size={15} />}
                        onClick={() => handleOpenModal(p)}
                      />
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        title="Tắt khuyến mãi"
                        aria-label={`Tắt mã ${p.code}`}
                        icon={<TrashIcon size={15} />}
                        onClick={() => handleDelete(p.id, p.code)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" {...dialog.overlayProps}>
          <div className="modal-content admin-modal admin-modal--lg" {...dialog.contentProps}>
            <div className="admin-modal-header">
              <h2 id={dialog.titleId}>{editingPromo ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</h2>
              <button type="button" onClick={handleCloseModal} className="modal-close modal-close--inline modal-close--lg" aria-label="Đóng">
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form admin-form--grid">
              <div className={`form-group${editingPromo ? ' span-full' : ''}`}>
                <label className="form-label" htmlFor="promo-code">Mã khuyến mãi</label>
                <input id="promo-code" type="text" name="code" className="input promo-code-input" value={formData.code} onChange={handleInputChange}
                  required disabled={!!editingPromo} placeholder="VD: SUMMER2026" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-percent">Giảm giá (%)</label>
                <input id="promo-percent" type="number" name="discountPercent" className="input" value={formData.discountPercent}
                  onChange={handleInputChange} required min="1" max="100" placeholder="VD: 10" />
              </div>

              <div className="form-group span-full">
                <label className="form-label" htmlFor="promo-description">Mô tả</label>
                <input id="promo-description" type="text" name="description" className="input" value={formData.description}
                  onChange={handleInputChange} placeholder="Mô tả ngắn cho khuyến mãi..." />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-max">Giảm tối đa (VNĐ)</label>
                <input id="promo-max" type="number" name="maxDiscount" className="input" value={formData.maxDiscount}
                  onChange={handleInputChange} min="0" placeholder="VD: 50000 (để trống = không giới hạn)" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-min-order">Đơn tối thiểu (VNĐ)</label>
                <input id="promo-min-order" type="number" name="minOrderAmount" className="input" value={formData.minOrderAmount}
                  onChange={handleInputChange} min="0" placeholder="VD: 100000" />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-tier">Hạng thành viên tối thiểu</label>
                <select id="promo-tier" name="minMembershipTier" className="input" value={formData.minMembershipTier} onChange={handleInputChange}>
                  {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-branch">Chi nhánh áp dụng</label>
                <select id="promo-branch" name="branchId" className="input" value={formData.branchId} onChange={handleInputChange}>
                  <option value="">Toàn hệ thống</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-start">Ngày bắt đầu</label>
                <input id="promo-start" type="datetime-local" name="startDate" className="input" value={formData.startDate} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-end">Ngày kết thúc</label>
                <input id="promo-end" type="datetime-local" name="endDate" className="input" value={formData.endDate} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="promo-limit">Giới hạn lượt dùng</label>
                <input id="promo-limit" type="number" name="usageLimit" className="input" value={formData.usageLimit}
                  onChange={handleInputChange} min="0" placeholder="Để trống = không giới hạn" />
              </div>

              <div className="form-group form-group--align-end">
                <label className="admin-check admin-check--strong">
                  <input type="checkbox" name="active" checked={formData.active} onChange={handleInputChange} />
                  Đang hoạt động
                </label>
              </div>

              <div className="admin-form-actions span-full">
                <Button onClick={handleCloseModal}>Hủy</Button>
                <Button type="submit" variant="primary">
                  {editingPromo ? 'Lưu khuyến mãi' : 'Thêm khuyến mãi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Tắt khuyến mãi"
        message={`Tắt mã "${deleteTarget?.code}"? Khách sẽ không dùng được mã này nữa.`}
        confirmText="Tắt mã"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default PromotionManagement;
