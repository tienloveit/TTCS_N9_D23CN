import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { foodApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from '../../components/Common/CinemaIcons';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const FoodManagement = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    lowStockThreshold: 5,
    active: true,
  });

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const res = await foodApi.getAllAdmin();
      setFoods(res.data.result || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách đồ ăn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const handleOpenModal = (food = null) => {
    if (food) {
      setEditingFood(food);
      setFormData({
        name: food.name || '',
        description: food.description || '',
        price: food.price || '',
        imageUrl: food.imageUrl || '',
        lowStockThreshold: food.lowStockThreshold ?? 5,
        active: food.active !== false,
      });
    } else {
      setEditingFood(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        lowStockThreshold: 5,
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFood(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: formData.price ? Number(formData.price) : 0,
        lowStockThreshold: Number(formData.lowStockThreshold || 0),
      };

      if (editingFood) {
        await foodApi.update(editingFood.id, payload);
        toast.success(`Cập nhật "${formData.name}" thành công!`);
      } else {
        await foodApi.create(payload);
        toast.success(`Thêm "${formData.name}" thành công!`);
      }
      handleCloseModal();
      fetchFoods();
    } catch (err) {
      toast.error('Đã có lỗi xảy ra: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = (id, name) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await foodApi.delete(deleteTarget.id);
      toast.success(`Đã vô hiệu hoá "${deleteTarget.name}"!`);
      setDeleteTarget(null);
      fetchFoods();
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const filteredFoods = useMemo(() => {
    return foods.filter((food) => {
      if (statusFilter === 'ACTIVE' && food.active === false) return false;
      if (statusFilter === 'INACTIVE' && food.active !== false) return false;
      if (statusFilter === 'LOW_STOCK' && !(food.lowStock || (food.stockQuantity != null && food.stockQuantity <= 0))) return false;
      return food.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [foods, statusFilter, searchTerm]);

  if (loading && !isModalOpen) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-foods">
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <h1 className="page-title">Quản lý Bắp & Nước</h1>
          <p className="page-subtitle">
            Tổng cộng <strong>{foods.length}</strong> sản phẩm trong hệ thống.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <PlusIcon size={18} />
          Thêm sản phẩm
        </button>
      </div>

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {[
              { key: 'ALL', label: 'Tất cả', count: foods.length },
              { key: 'ACTIVE', label: 'Đang bán', count: foods.filter((f) => f.active !== false).length },
              {
                key: 'LOW_STOCK',
                label: 'Sắp hết / Hết hàng',
                count: foods.filter((f) => f.lowStock || (f.stockQuantity != null && f.stockQuantity <= 0)).length,
              },
              { key: 'INACTIVE', label: 'Ngừng bán', count: foods.filter((f) => f.active === false).length },
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

          <div style={{ position: 'relative', maxWidth: '320px', flex: '0 1 300px' }}>
            <SearchIcon
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Tìm tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', height: 38, background: 'var(--bg-input)' }}
            />
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Sản phẩm</th>
              <th>Mô tả</th>
              <th>Giá</th>
              <th>Tồn kho</th>
              <th>Trạng thái</th>
              <th style={{ width: '120px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredFoods.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}
                >
                  {searchTerm
                    ? 'Không tìm thấy sản phẩm nào'
                    : 'Chưa có sản phẩm nào trong hệ thống'}
                </td>
              </tr>
            ) : (
              filteredFoods.map((food, idx) => (
                <tr key={food.id || idx}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <SafeImage
                        src={food.imageUrl}
                        alt={food.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          background: 'var(--bg-secondary)',
                        }}
                        fallback="https://via.placeholder.com/48x48?text=No+Img"
                      />
                      <strong style={{ color: 'var(--text-primary)' }}>{food.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        maxWidth: '280px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                      }}
                    >
                      {food.description || '—'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(food.price)}
                  </td>
                  <td>
                    {food.stockQuantity == null ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Không theo dõi</span>
                    ) : (
                      <div style={{ display: 'grid', gap: 4 }}>
                        <strong style={{ color: food.inStock ? 'var(--text-primary)' : '#ef4444' }}>
                          {food.stockQuantity}
                        </strong>
                        {food.lowStock && food.inStock && (
                          <span style={{ color: '#f59e0b', fontSize: '0.76rem', fontWeight: 700 }}>
                            Sắp hết
                          </span>
                        )}
                        {!food.inStock && (
                          <span style={{ color: '#ef4444', fontSize: '0.76rem', fontWeight: 700 }}>
                            Hết hàng
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${food.active !== false ? 'status--active' : 'status--inactive'}`}
                    >
                      {food.active !== false ? 'Đang bán' : 'Ngừng bán'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Sửa"
                        onClick={() => handleOpenModal(food)}
                      >
                        <EditIcon size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Vô hiệu hoá"
                        style={{ color: '#ef4444' }}
                        onClick={() => handleDelete(food.id, food.name)}
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Food Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="modal-content admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {editingFood ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="modal-close"
                style={{ position: 'static', width: 34, height: 34 }}
                aria-label="Đóng"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="auth-form"
              style={{ display: 'grid', gap: '20px' }}
            >
              <div className="form-group">
                <label className="form-label">Tên sản phẩm</label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="VD: Combo Bắp Nước Lớn"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Mô tả ngắn về sản phẩm..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giá (VNĐ)</label>
                <input
                  type="number"
                  name="price"
                  className="input"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="VD: 89000"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {editingFood ? 'Tồn kho được cập nhật tại mục Nhập xuất kho.' : 'Sản phẩm mới có tồn bằng 0. Hãy nhập hàng tại mục Nhập xuất kho trước khi bán.'}
                </p>

                <div className="form-group">
                  <label className="form-label">Ngưỡng cảnh báo</label>
                  <input
                    type="number"
                    name="lowStockThreshold"
                    className="input"
                    value={formData.lowStockThreshold}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">URL Hình ảnh</label>
                <input
                  type="text"
                  name="imageUrl"
                  className="input"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
                {formData.imageUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <SafeImage
                      src={formData.imageUrl}
                      alt="Preview"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid var(--border)',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  Đang bán (hiển thị cho khách hàng)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingFood ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Huỷ bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Vô hiệu hoá sản phẩm"
        message={`Bạn có chắc chắn muốn ngừng bán sản phẩm "${deleteTarget?.name}"?`}
        confirmText="Ngừng bán"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default FoodManagement;
