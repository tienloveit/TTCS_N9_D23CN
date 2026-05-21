import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { foodApi } from '../../api';

const typeLabels = {
  IMPORT: 'Nhập kho',
  ADJUSTMENT: 'Điều chỉnh',
  SALE: 'Bán hàng',
  REFUND: 'Hoàn trả',
};

const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const InventoryManagementPage = () => {
  const [foods, setFoods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [quantityChange, setQuantityChange] = useState('');
  const [absolute, setAbsolute] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [foodRes, txRes] = await Promise.all([
        foodApi.getAllAdmin(),
        foodApi.getStockTransactions(selectedFoodId ? { foodId: selectedFoodId } : undefined),
      ]);
      setFoods(foodRes.data.result || []);
      setTransactions(txRes.data.result || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải dữ liệu kho');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedFoodId]);

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!selectedFoodId) {
      toast.error('Chọn sản phẩm cần điều chỉnh');
      return;
    }
    try {
      await foodApi.adjustStock(selectedFoodId, {
        quantityChange: Number(quantityChange),
        setAbsoluteQuantity: absolute,
        note,
      });
      toast.success('Đã cập nhật tồn kho');
      setQuantityChange('');
      setNote('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật tồn kho');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Nhập xuất kho</h1>
          <p className="page-subtitle">Quản lý phiếu nhập, điều chỉnh tồn và lịch sử xuất kho khi bán bắp nước.</p>
        </div>
      </div>

      <div className="analytics-grid">
        <section className="admin-table-card" style={{ padding: 20 }}>
          <h3 className="section-title">Điều chỉnh tồn kho</h3>
          <form onSubmit={handleAdjust} style={{ display: 'grid', gap: 14, marginTop: 16 }}>
            <select className="input" value={selectedFoodId} onChange={(e) => setSelectedFoodId(e.target.value)}>
              <option value="">Chọn sản phẩm</option>
              {foods.map((food) => (
                <option key={food.id} value={food.id}>{food.name} - tồn {food.stockQuantity ?? 'không theo dõi'}</option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder={absolute ? 'Tồn kho mới' : 'Số lượng tăng/giảm'}
              required
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={absolute} onChange={(e) => setAbsolute(e.target.checked)} />
              Đặt tồn kho tuyệt đối
            </label>
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do điều chỉnh" />
            <button className="btn btn-primary" type="submit">Lưu phiếu kho</button>
          </form>
        </section>

        <section className="admin-table-card">
          <div className="table-header">
            <h3 className="section-title">Mặt hàng sắp hết</h3>
          </div>
          <table className="admin-table">
            <thead><tr><th>Sản phẩm</th><th>Tồn</th><th>Ngưỡng</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {foods.filter((food) => food.lowStock || !food.inStock).slice(0, 8).map((food) => (
                <tr key={food.id}>
                  <td>{food.name}</td>
                  <td>{food.stockQuantity ?? '-'}</td>
                  <td>{food.lowStockThreshold ?? '-'}</td>
                  <td><span className={`status-badge ${food.inStock ? 'status--pending' : 'status--inactive'}`}>{food.inStock ? 'Sắp hết' : 'Hết hàng'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-table-card">
        <div className="table-header"><h3 className="section-title">Lịch sử kho</h3></div>
        <table className="admin-table">
          <thead>
            <tr><th>Thời gian</th><th>Sản phẩm</th><th>Loại</th><th>Trước</th><th>Thay đổi</th><th>Sau</th><th>Người tạo</th><th>Ghi chú</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32 }}>Đang tải...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32 }}>Chưa có lịch sử kho</td></tr>
            ) : transactions.map((tx) => (
              <tr key={tx.transactionId}>
                <td>{formatDateTime(tx.createdAt)}</td>
                <td>{tx.foodName}</td>
                <td>{typeLabels[tx.type] || tx.type}</td>
                <td>{tx.quantityBefore ?? '-'}</td>
                <td style={{ fontWeight: 700, color: Number(tx.quantityChange) >= 0 ? '#16a34a' : '#dc2626' }}>
                  {Number(tx.quantityChange) > 0 ? '+' : ''}{tx.quantityChange}
                </td>
                <td>{tx.quantityAfter ?? '-'}</td>
                <td>{tx.createdByUsername || '-'}</td>
                <td>{tx.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default InventoryManagementPage;
