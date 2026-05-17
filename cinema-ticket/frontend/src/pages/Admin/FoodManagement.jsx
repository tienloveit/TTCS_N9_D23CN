import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { foodApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';

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

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
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
        active: food.active !== false,
      });
    } else {
      setEditingFood(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
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

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn vô hiệu hoá "${name}"?`)) {
      try {
        await foodApi.delete(id);
        toast.success(`Đã vô hiệu hoá "${name}"!`);
        fetchFoods();
      } catch (err) {
        toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const filteredFoods = foods.filter((food) =>
    food.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="18"
            height="18"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm sản phẩm
        </button>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <div style={{ position: 'relative', maxWidth: '320px', flex: 1 }}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input"
              placeholder="Tìm tên sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', background: 'var(--bg-input)' }}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {filteredFoods.length} kết quả
          </span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Sản phẩm</th>
              <th>Mô tả</th>
              <th>Giá</th>
              <th>Trạng thái</th>
              <th style={{ width: '120px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredFoods.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
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
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          width="15"
                          height="15"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Vô hiệu hoá"
                        style={{ color: '#ef4444' }}
                        onClick={() => handleDelete(food.id, food.name)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          width="15"
                          height="15"
                        >
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
                onClick={handleCloseModal}
                className="modal-close"
                style={{ position: 'static', fontSize: '1.5rem' }}
              >
                ✕
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
    </div>
  );
};

export default FoodManagement;
