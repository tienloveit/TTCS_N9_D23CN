import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { promotionApi, branchApi } from '../../api';

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
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleDelete = async (id, code) => {
    if (window.confirm(`Bạn có chắc chắn muốn vô hiệu hoá mã "${code}"?`)) {
      try {
        await promotionApi.delete(id);
        toast.success(`Đã vô hiệu hoá "${code}"!`);
        fetchPromotions();
      } catch (err) {
        toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const filteredPromotions = promotions.filter((p) =>
    p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !isModalOpen) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="admin-promotions">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Khuyến mãi</h1>
          <p className="page-subtitle">Tổng cộng <strong>{promotions.length}</strong> mã khuyến mãi.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm khuyến mãi
        </button>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <div style={{ position: 'relative', maxWidth: '320px', flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" className="input" placeholder="Tìm mã khuyến mãi..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '40px', background: 'var(--bg-input)' }} />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{filteredPromotions.length} kết quả</span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Mã</th>
              <th>Giảm</th>
              <th>Giảm tối đa</th>
              <th>Hạng tối thiểu</th>
              <th>Chi nhánh</th>
              <th>Đã dùng</th>
              <th>Hiệu lực</th>
              <th>Trạng thái</th>
              <th style={{ width: '120px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredPromotions.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {searchTerm ? 'Không tìm thấy kết quả' : 'Chưa có mã khuyến mãi'}
              </td></tr>
            ) : (
              filteredPromotions.map((p, idx) => (
                <tr key={p.id || idx}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td>
                    <div>
                      <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>{p.code}</strong>
                      {p.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.description}</div>}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{p.discountPercent}%</td>
                  <td>{formatCurrency(p.maxDiscount)}</td>
                  <td>{p.minMembershipTier ? TIER_OPTIONS.find(t => t.value === p.minMembershipTier)?.label || p.minMembershipTier : 'Tất cả'}</td>
                  <td>{p.branchName || 'Toàn hệ thống'}</td>
                  <td>{p.usedCount || 0}{p.usageLimit ? ` / ${p.usageLimit}` : ''}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <div>{formatDate(p.startDate)}</div>
                    <div>→ {formatDate(p.endDate)}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${p.active ? 'status--active' : 'status--inactive'}`}>
                      {p.active ? 'Hoạt động' : 'Đã tắt'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => handleOpenModal(p)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Vô hiệu hoá" style={{ color: '#ef4444' }} onClick={() => handleDelete(p.id, p.code)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content admin-modal" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{editingPromo ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi mới'}</h2>
              <button onClick={handleCloseModal} className="modal-close" style={{ position: 'static', fontSize: '1.5rem' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group" style={{ gridColumn: editingPromo ? 'span 2' : 'span 1' }}>
                <label className="form-label">Mã khuyến mãi</label>
                <input type="text" name="code" className="input" value={formData.code} onChange={handleInputChange}
                  required disabled={!!editingPromo} placeholder="VD: SUMMER2026" style={{ textTransform: 'uppercase' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Giảm giá (%)</label>
                <input type="number" name="discountPercent" className="input" value={formData.discountPercent}
                  onChange={handleInputChange} required min="1" max="100" placeholder="VD: 10" />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Mô tả</label>
                <input type="text" name="description" className="input" value={formData.description}
                  onChange={handleInputChange} placeholder="Mô tả ngắn cho khuyến mãi..." />
              </div>

              <div className="form-group">
                <label className="form-label">Giảm tối đa (VNĐ)</label>
                <input type="number" name="maxDiscount" className="input" value={formData.maxDiscount}
                  onChange={handleInputChange} min="0" placeholder="VD: 50000 (để trống = không giới hạn)" />
              </div>

              <div className="form-group">
                <label className="form-label">Đơn tối thiểu (VNĐ)</label>
                <input type="number" name="minOrderAmount" className="input" value={formData.minOrderAmount}
                  onChange={handleInputChange} min="0" placeholder="VD: 100000" />
              </div>

              <div className="form-group">
                <label className="form-label">Hạng thành viên tối thiểu</label>
                <select name="minMembershipTier" className="input" value={formData.minMembershipTier} onChange={handleInputChange}>
                  {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Chi nhánh áp dụng</label>
                <select name="branchId" className="input" value={formData.branchId} onChange={handleInputChange}>
                  <option value="">Toàn hệ thống</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ngày bắt đầu</label>
                <input type="datetime-local" name="startDate" className="input" value={formData.startDate} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày kết thúc</label>
                <input type="datetime-local" name="endDate" className="input" value={formData.endDate} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Giới hạn lượt dùng</label>
                <input type="number" name="usageLimit" className="input" value={formData.usageLimit}
                  onChange={handleInputChange} min="0" placeholder="Để trống = không giới hạn" />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                  <input type="checkbox" name="active" checked={formData.active} onChange={handleInputChange}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                  Đang hoạt động
                </label>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingPromo ? 'Lưu thay đổi' : 'Thêm khuyến mãi'}
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary" style={{ flex: 1 }}>Huỷ bỏ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionManagement;
