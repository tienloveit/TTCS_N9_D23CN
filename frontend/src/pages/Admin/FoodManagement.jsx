import { DataTable, FilterBar, OpsButton, OpsConfirm, OpsDialog, OpsPage, OpsPanel, Segmented, StatusBadge, Field, Select } from '../../components/Ops';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { branchApi, foodApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { branchScopeLabel, canEditBranchItem } from '../../utils/branchScope';
import SafeImage from '../../components/Common/SafeImage';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from '../../components/Common/CinemaIcons';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const FoodManagement = () => {
  const { user, isAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    branchId: '',
  });

  const fetchFoods = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await foodApi.getAllAdmin();
      setFoods(res.data.result || []);
    } catch (err) {
      setLoadError(true);
      console.error('Lỗi khi tải danh sách đồ ăn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
    branchApi.getAll()
      .then((res) => setBranches(res.data.result || []))
      .catch(() => setBranches([]));
  }, []);

  const ownBranchName = branchScopeLabel({ branchId: user?.branchId }, branches);

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
        branchId: food.branchId == null ? '' : String(food.branchId),
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
        branchId: '',
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
    if (saving) return;
    setSaving(true);
    try {
      const { stockQuantity, lowStockThreshold, unlimitedStock, branchId, ...rest } = formData;
      const payload = {
        ...rest,
        price: formData.price ? Number(formData.price) : 0,
        stockQuantity: unlimitedStock || stockQuantity === '' ? null : Number(stockQuantity),
        lowStockThreshold: lowStockThreshold === '' ? null : Number(lowStockThreshold),
        unlimitedStock,
      };

      if (editingFood) {
        // Phạm vi không đổi khi sửa: UpdateFoodRequest coi branchId null là giữ nguyên.
        await foodApi.update(editingFood.id, payload);
        toast.success(`Đã cập nhật "${formData.name}"`);
      } else {
        // MANAGER luôn tạo món cho chi nhánh của mình, backend cũng ép giá trị này.
        await foodApi.create({ ...payload, branchId: isAdmin ? (branchId ? Number(branchId) : null) : user?.branchId ?? null });
        toast.success(`Đã thêm "${formData.name}"`);
      }
      handleCloseModal();
      fetchFoods();
    } catch (err) {
      toast.error('Đã có lỗi xảy ra: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
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
      toast.success(`Đã vô hiệu hóa "${deleteTarget.name}"`);
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


  return (
    <OpsPage title="Quản lý bắp nước" description={isAdmin
      ? <>Tổng cộng <strong>{foods.length}</strong> sản phẩm trong hệ thống.</>
      : <><strong>{foods.length}</strong> sản phẩm bán tại {ownBranchName}. Món dùng chung toàn hệ thống chỉ quản trị viên sửa được.</>} actions={<OpsButton variant="primary" icon={<PlusIcon size={18} />} onClick={() => handleOpenModal()}>
          Thêm sản phẩm
        </OpsButton>}>

      <FilterBar search={searchTerm} onSearchChange={setSearchTerm} searchLabel="Tìm sản phẩm" searchPlaceholder="Tìm tên sản phẩm..."
        filtered={Boolean(searchTerm || statusFilter !== 'ALL')} onReset={() => { setSearchTerm(''); setStatusFilter('ALL'); }} resultLabel={`${filteredFoods.length} sản phẩm`}>
        <Segmented label="Trạng thái" value={statusFilter} onChange={setStatusFilter} options={([
              { key: 'ALL', label: 'Tất cả', count: foods.length },
              { key: 'ACTIVE', label: 'Đang bán', count: foods.filter((f) => f.active !== false).length },
              { key: 'INACTIVE', label: 'Ngừng bán', count: foods.filter((f) => f.active === false).length },
            ]).map(tab => {
                return { value: tab.key, label: tab.label, count: tab.count };
              })} />
      </FilterBar>
      <OpsPanel flush title="Sản phẩm">
        <DataTable caption="Sản phẩm" rows={filteredFoods} rowKey={food => food.id}
          state={loading ? 'loading' : loadError ? 'error' : 'ready'} onRetry={fetchFoods}
          empty={{ title: 'Không có sản phẩm phù hợp', action: { label: 'Làm mới', onClick: fetchFoods } }}
          columns={[
            { key: 'index', header: "#", render: (food, idx) => idx + 1 },
            { key: 'san_pham', header: "Sản phẩm", render: food => <> <div className="o-media">
                      <SafeImage
                        src={food.imageUrl}
                        alt={food.name}
                        className="o-thumb"
                      />
                      <strong>{food.name}</strong>
                    </div> </> },
            { key: 'mo_ta', header: "Mô tả", render: food => <> <span className="o-clamp" title={food.description || undefined}>
                      {food.description || '—'}
                    </span> </> },
            { key: 'pham_vi', header: "Phạm vi", render: food => branchScopeLabel(food, branches) },
            { key: 'gia', header: "Giá", align: 'end', render: food => formatCurrency(food.price) },
            { key: 'ton_kho', header: "Tồn kho", render: food => food.stockQuantity == null ? (
                      <span className="o-subline">Không giới hạn</span>
                    ) : (
                      <span className="o-actions">
                        <strong>{food.stockQuantity}</strong>
                        {food.stockQuantity <= 0 ? (
                          <StatusBadge tone="danger">Hết hàng</StatusBadge>
                        ) : food.stockQuantity <= (food.lowStockThreshold ?? 10) ? (
                          <StatusBadge tone="warning">Sắp hết</StatusBadge>
                        ) : null}
                      </span>
                    ) },
            { key: 'trang_thai', header: "Trạng thái", render: food => <> <StatusBadge tone={food.active !== false ? 'success' : 'neutral'}>
                      {food.active !== false ? 'Đang bán' : 'Ngừng bán'}
                    </StatusBadge> </> },
            { key: 'hanh_dong', header: "Hành động", render: food => !canEditBranchItem(food, user)
              ? <small className="o-subline">Chỉ quản trị viên sửa</small>
              : <> <div className="o-actions">
                      <OpsButton
                        variant="ghost"
                        size="sm"
                        title="Sửa sản phẩm"
                        aria-label={`Sửa ${food.name}`}
                        icon={<EditIcon size={15} />}
                        onClick={() => handleOpenModal(food)}
                      />
                      <OpsButton
                        variant="ghost-danger"
                        size="sm"
                        title="Ngừng bán"
                        aria-label={`Ngừng bán ${food.name}`}
                        icon={<TrashIcon size={15} />}
                        onClick={() => handleDelete(food.id, food.name)}
                      />
                    </div> </> }
          ]} />
      </OpsPanel>

      {/* Food Modal */}
      {isModalOpen && (
        <OpsDialog open title={editingFood ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'} onClose={handleCloseModal} disabled={saving} size="md" footer={<><OpsButton disabled={saving} onClick={handleCloseModal}>Hủy</OpsButton>
                <OpsButton disabled={saving} type="submit" form="o-food-form" variant="primary">
                  {editingFood ? 'Lưu sản phẩm' : 'Thêm sản phẩm'}
                </OpsButton></>}>

            <form id="o-food-form" onSubmit={handleSubmit} className="o-form">
              <Field label="Tên sản phẩm">
                <input
                  id="food-name"
                  type="text"
                  name="name"
                  className="o-input"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ví dụ Combo Bắp Nước Lớn"
                />
              </Field>

              {isAdmin && !editingFood ? (
                <Field label="Phạm vi bán">
                  <Select name="branchId" value={formData.branchId} onChange={handleInputChange}>
                    <option value="">Toàn hệ thống</option>
                    {branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                  </Select>
                </Field>
              ) : (
                <div className="o-field">
                  <span className="o-field__label">Phạm vi bán</span>
                  <p className="o-field__static">{editingFood ? branchScopeLabel(editingFood, branches) : ownBranchName}</p>
                  {editingFood && <span className="o-field__hint">Không đổi phạm vi sau khi tạo.</span>}
                </div>
              )}

              <Field label="Mô tả">
                <textarea
                  id="food-description"
                  name="description"
                  className="o-input"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả ngắn về sản phẩm..."
                />
              </Field>

              <Field label="Giá (VNĐ)">
                <input
                  id="food-price"
                  type="number"
                  name="price"
                  className="o-input"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="Ví dụ 89000"
                />
              </Field>

              <div className="o-field">
                <label className="o-field__label" htmlFor="food-image">URL hình ảnh</label>
                <input
                  id="food-image"
                  type="text"
                  name="imageUrl"
                  className="o-input"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://..."
                />
                {formData.imageUrl && (
                  <SafeImage
                    src={formData.imageUrl}
                    alt="Ảnh xem trước"
                    className="o-thumb o-thumb--preview"
                  />
                )}
              </div>

              <div className="o-field">
                <label className="o-field__label" htmlFor="food-stock">Số lượng tồn kho</label>
                <input
                  id="food-stock"
                  type="number"
                  name="stockQuantity"
                  className="o-input"
                  value={formData.unlimitedStock ? '' : formData.stockQuantity}
                  onChange={handleInputChange}
                  disabled={formData.unlimitedStock}
                  required={!formData.unlimitedStock}
                  min="0"
                  step="1"
                  placeholder={formData.unlimitedStock ? 'Không giới hạn' : 'VD: 100'}
                />
                <label className="o-actions">
                  <input
                    type="checkbox"
                    name="unlimitedStock"
                    checked={formData.unlimitedStock}
                    onChange={handleInputChange}
                  />
                  Không giới hạn số lượng
                </label>
              </div>

              <Field label="Ngưỡng cảnh báo sắp hết (mặc định 10)">
                <input
                  id="food-low-stock"
                  type="number"
                  name="lowStockThreshold"
                  className="o-input"
                  value={formData.lowStockThreshold}
                  onChange={handleInputChange}
                  disabled={formData.unlimitedStock}
                  min="0"
                  step="1"
                  placeholder="10"
                />
              </Field>

              <div className="o-field">
                <label className="o-actions">
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                  />
                  Đang bán (hiển thị cho khách hàng)
                </label>
              </div>


            </form>
          </OpsDialog>
      )}

      <OpsConfirm
        open={Boolean(deleteTarget)}
        title="Ngừng bán sản phẩm"
        message={`Ngừng bán "${deleteTarget?.name}"? Khách sẽ không thấy món này khi đặt vé.`}
        confirmText="Ngừng bán"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </OpsPage>
  );
};

export default FoodManagement;
