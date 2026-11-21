import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { foodApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import useModalDialog from '../../components/Common/useModalDialog';
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
  const dialog = useModalDialog(isModalOpen, () => handleCloseModal());
  const [editingFood, setEditingFood] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    stockQuantity: '',
    lowStockThreshold: '',
    unlimitedStock: false,
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
        stockQuantity: food.stockQuantity ?? '',
        lowStockThreshold: food.lowStockThreshold ?? '',
        unlimitedStock: food.stockQuantity == null,
        active: food.active !== false,
      });
    } else {
      setEditingFood(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        stockQuantity: '',
        lowStockThreshold: '',
        unlimitedStock: false,
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
      const { stockQuantity, lowStockThreshold, unlimitedStock, ...rest } = formData;
      const payload = {
        ...rest,
        price: formData.price ? Number(formData.price) : 0,
        stockQuantity: unlimitedStock || stockQuantity === '' ? null : Number(stockQuantity),
        lowStockThreshold: lowStockThreshold === '' ? null : Number(lowStockThreshold),
        unlimitedStock,
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
      toast.success(`Đã vô hiệu hóa "${deleteTarget.name}"!`);
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
      <div className="page-header page-header--split">
        <div>
          <h1 className="page-title">Quản lý bắp nước</h1>
          <p className="page-subtitle">
            Tổng cộng <strong>{foods.length}</strong> sản phẩm trong hệ thống.
          </p>
        </div>
        <Button variant="primary" icon={<PlusIcon size={18} />} onClick={() => handleOpenModal()}>
          Thêm sản phẩm
        </Button>
      </div>

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {[
              { key: 'ALL', label: 'Tất cả', count: foods.length },
              { key: 'ACTIVE', label: 'Đang bán', count: foods.filter((f) => f.active !== false).length },
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

          <div className="admin-search">
            <SearchIcon size={16} className="input-leading-icon" aria-hidden="true" />
            <input
              type="search"
              className="input input-sm"
              placeholder="Tìm tên sản phẩm..."
              aria-label="Tìm sản phẩm theo tên"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-index">#</th>
              <th>Sản phẩm</th>
              <th>Mô tả</th>
              <th>Giá</th>
              <th>Tồn kho</th>
              <th>Trạng thái</th>
              <th className="col-actions">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredFoods.length === 0 ? (
              <tr>
                <td colSpan="7" className="admin-table-empty">
                  {searchTerm
                    ? 'Không tìm thấy sản phẩm nào. Thử từ khóa khác.'
                    : 'Chưa có sản phẩm nào. Bấm “Thêm sản phẩm” để tạo món đầu tiên.'}
                </td>
              </tr>
            ) : (
              filteredFoods.map((food, idx) => (
                <tr key={food.id || idx}>
                  <td className="cell-index">{idx + 1}</td>
                  <td>
                    <div className="admin-media-cell">
                      <SafeImage
                        src={food.imageUrl}
                        alt={food.name}
                        className="admin-thumb"
                      />
                      <strong>{food.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="cell-clamp" title={food.description || undefined}>
                      {food.description || '—'}
                    </span>
                  </td>
                  <td className="cell-strong cell-nowrap">{formatCurrency(food.price)}</td>

                  <td className="cell-nowrap">
                    {food.stockQuantity == null ? (
                      <span className="cell-muted">Không giới hạn</span>
                    ) : (
                      <span className="admin-inline">
                        <strong>{food.stockQuantity}</strong>
                        {food.stockQuantity <= 0 ? (
                          <Badge tone="danger">Hết hàng</Badge>
                        ) : food.stockQuantity <= (food.lowStockThreshold ?? 10) ? (
                          <Badge tone="warning">Sắp hết</Badge>
                        ) : null}
                      </span>
                    )}
                  </td>

                  <td>
                    <Badge tone={food.active !== false ? 'success' : 'neutral'} dot>
                      {food.active !== false ? 'Đang bán' : 'Ngừng bán'}
                    </Badge>
                  </td>
                  <td>
                    <div className="action-btns">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Sửa sản phẩm"
                        aria-label={`Sửa ${food.name}`}
                        icon={<EditIcon size={15} />}
                        onClick={() => handleOpenModal(food)}
                      />
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        title="Ngừng bán"
                        aria-label={`Ngừng bán ${food.name}`}
                        icon={<TrashIcon size={15} />}
                        onClick={() => handleDelete(food.id, food.name)}
                      />
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
        <div className="modal-overlay" {...dialog.overlayProps}>
          <div className="modal-content admin-modal" {...dialog.contentProps}>
            <div className="admin-modal-header">
              <h2 id={dialog.titleId}>
                {editingFood ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="modal-close modal-close--inline modal-close--lg"
                aria-label="Đóng"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label className="form-label" htmlFor="food-name">Tên sản phẩm</label>
                <input
                  id="food-name"
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
                <label className="form-label" htmlFor="food-description">Mô tả</label>
                <textarea
                  id="food-description"
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả ngắn về sản phẩm..."
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="food-price">Giá (VNĐ)</label>
                <input
                  id="food-price"
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
                <label className="form-label" htmlFor="food-image">URL hình ảnh</label>
                <input
                  id="food-image"
                  type="text"
                  name="imageUrl"
                  className="input"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
                {formData.imageUrl && (
                  <SafeImage
                    src={formData.imageUrl}
                    alt="Ảnh xem trước"
                    className="admin-thumb admin-thumb--preview"
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="food-stock">Số lượng tồn kho</label>
                <input
                  id="food-stock"
                  type="number"
                  name="stockQuantity"
                  className="input"
                  value={formData.unlimitedStock ? '' : formData.stockQuantity}
                  onChange={handleInputChange}
                  disabled={formData.unlimitedStock}
                  required={!formData.unlimitedStock}
                  min="0"
                  step="1"
                  placeholder={formData.unlimitedStock ? 'Không giới hạn' : 'VD: 100'}
                />
                <label className="admin-check">
                  <input
                    type="checkbox"
                    name="unlimitedStock"
                    checked={formData.unlimitedStock}
                    onChange={handleInputChange}
                  />
                  Không giới hạn số lượng
                </label>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="food-low-stock">Ngưỡng cảnh báo sắp hết (mặc định 10)</label>
                <input
                  id="food-low-stock"
                  type="number"
                  name="lowStockThreshold"
                  className="input"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  disabled={formData.unlimitedStock}
                  min="0"
                  step="1"
                  placeholder="10"
                />
              </div>

              <div className="form-group">
                <label className="admin-check admin-check--strong">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                  />
                  Đang bán (hiển thị cho khách hàng)
                </label>
              </div>

              <div className="admin-form-actions">
                <Button onClick={handleCloseModal}>Hủy</Button>
                <Button type="submit" variant="primary">
                  {editingFood ? 'Lưu sản phẩm' : 'Thêm sản phẩm'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Ngừng bán sản phẩm"
        message={`Ngừng bán "${deleteTarget?.name}"? Khách sẽ không thấy món này khi đặt vé.`}
        confirmText="Ngừng bán"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default FoodManagement;
