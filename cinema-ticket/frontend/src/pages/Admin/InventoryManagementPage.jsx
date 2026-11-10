import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { foodApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import './InventoryManagementPage.css';

const typeLabels = {
  IMPORT: 'Nhập hàng', EXPORT: 'Xuất hủy / hao hụt', STOCKTAKE: 'Kiểm kê',
  ADJUSTMENT: 'Điều chỉnh cũ', SALE: 'Xuất bán', REFUND: 'Hoàn tồn cũ',
};
const operations = ['IMPORT', 'EXPORT', 'STOCKTAKE'];
const exportReasons = ['Hư hỏng', 'Hết hạn', 'Hao hụt', 'Sử dụng nội bộ', 'Khác'];
const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';
const formatStock = (value) => value == null ? 'Chưa kiểm kê' : value;

const InventoryManagementPage = () => {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [operation, setOperation] = useState('IMPORT');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [historyFoodId, setHistoryFoodId] = useState('');
  const [historyType, setHistoryType] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const submitting = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [foodRes, txRes] = await Promise.all([foodApi.getAllAdmin(), foodApi.getStockTransactions()]);
      setFoods((foodRes.data.result || []).filter((food) => user?.role !== 'MANAGER'
        || (food.branchId != null && String(food.branchId) === String(user?.branchId))));
      setTransactions(txRes.data.result || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || 'Không thể tải dữ liệu kho. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.branchId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const selectedFood = foods.find((food) => String(food.id) === selectedFoodId);
  const amount = quantity === '' ? null : Number(quantity);
  const validAmount = Number.isSafeInteger(amount) && amount >= (operation === 'STOCKTAKE' ? 0 : 1) && amount <= 2147483647;
  const untracked = selectedFood && selectedFood.stockQuantity == null;
  const nextStock = !selectedFood || !validAmount || (untracked && operation !== 'STOCKTAKE') ? null
    : operation === 'STOCKTAKE' ? amount : selectedFood.stockQuantity + (operation === 'EXPORT' ? -amount : amount);
  const stockError = nextStock != null && (nextStock < 0 || nextStock > 2147483647);
  const details = operation === 'EXPORT' ? `${reason}${note.trim() ? `: ${note.trim()}` : ''}` : note.trim();
  const canSave = selectedFood && validAmount && !stockError && details.trim() && details.length <= 500
    && (operation !== 'EXPORT' || (reason && (reason !== 'Khác' || note.trim())))
    && !(untracked && operation !== 'STOCKTAKE') && !loading && !saving && !loadError;

  const handleAdjust = async (event) => {
    event.preventDefault();
    if (!canSave || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    try {
      await foodApi.adjustStock(selectedFoodId, {
        type: operation, quantityChange: amount, note: details,
        expectedQuantity: selectedFood.stockQuantity,
      });
      toast.success(`Đã ghi nhận ${typeLabels[operation].toLowerCase()}`);
      setQuantity(''); setReason(''); setNote('');
      await fetchData();
    } catch (err) {
      const message = err.response?.data?.message;
      toast.error(message === 'Request validation failed'
        ? 'Dữ liệu không hợp lệ hoặc tồn kho đã thay đổi. Hãy tải lại và kiểm tra trước khi ghi nhận.'
        : message || 'Không thể lưu phiếu kho. Vui lòng tải lại số tồn và thử lại.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const visibleFoods = foods.filter((food) => food.name.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')));
  const visibleTransactions = transactions.filter((tx) => (!historyFoodId || String(tx.foodId) === historyFoodId)
    && (!historyType || tx.type === historyType) && (!historyDate || String(tx.createdAt).slice(0, 10) === historyDate));

  return (
    <div className="dashboard-container inventory-page">
      <div className="dashboard-header">
        <div><h1 className="page-title">Nhập xuất kho</h1><p className="page-subtitle">Theo dõi hàng bán tại rạp. Mỗi phiếu ghi nhận một mặt hàng.</p></div>
        <button className="btn btn-secondary" onClick={fetchData} disabled={loading || saving}>Tải lại dữ liệu</button>
      </div>
      {loadError && <div className="error-message" role="alert">{loadError}</div>}
      <div className="inventory-workspace">
        <section className="admin-table-card inventory-form-card">
          <h2 className="section-title">Ghi nhận kho</h2>
          <div className="inventory-operation-tabs" role="group" aria-label="Loại phiếu kho">
            {operations.map((type) => <button key={type} type="button" className={`btn ${operation === type ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={operation === type} disabled={saving} onClick={() => { setOperation(type); setQuantity(''); setReason(''); setNote(''); }}>{typeLabels[type]}</button>)}
          </div>
          <p className="inventory-help">{operation === 'IMPORT' ? 'Nhập số lượng hàng thực tế nhận thêm, không nhập tổng tồn.'
            : operation === 'EXPORT' ? 'Ghi nhận hàng hủy hoặc hao hụt. Xuất bán tự động ghi nhận khi thanh toán.'
              : 'Đếm hàng thực tế rồi nhập tổng số còn lại. Hệ thống ghi nhận chênh lệch, kể cả khi không lệch.'}</p>
          <form onSubmit={handleAdjust} className="inventory-form">
            <fieldset disabled={saving || loading}>
              <label className="form-label" htmlFor="inventory-food">Mặt hàng</label>
              <select id="inventory-food" className="input" required value={selectedFoodId} onChange={(event) => { setSelectedFoodId(event.target.value); setQuantity(''); }}>
                <option value="">Chọn mặt hàng</option>
                {foods.map((food) => <option key={food.id} value={food.id}>{food.name} — tồn: {formatStock(food.stockQuantity)}{food.active === false ? ' (ngừng bán)' : ''}</option>)}
              </select>
              {untracked && <p className="inventory-help">Chưa có số tồn. Hãy chọn Kiểm kê để ghi nhận số lượng thực tế trước.</p>}
              <label className="form-label" htmlFor="inventory-quantity">{operation === 'STOCKTAKE' ? 'Số lượng thực tế đếm được' : operation === 'IMPORT' ? 'Số lượng nhập thêm' : 'Số lượng xuất giảm'}</label>
              <input id="inventory-quantity" className="input" type="number" min={operation === 'STOCKTAKE' ? 0 : 1} max="2147483647" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              {operation === 'EXPORT' && <><label className="form-label" htmlFor="inventory-reason">Lý do xuất</label>
                <select id="inventory-reason" className="input" required value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Chọn lý do</option>{exportReasons.map((item) => <option key={item}>{item}</option>)}</select></>}
              <label className="form-label" htmlFor="inventory-note">{operation === 'IMPORT' ? 'Nguồn nhập / ghi chú' : operation === 'STOCKTAKE' ? 'Ghi chú kiểm kê' : 'Chi tiết'}{operation === 'EXPORT' && reason !== 'Khác' ? ' (nếu có)' : ' (bắt buộc)'}</label>
              <textarea id="inventory-note" className="input" value={note} maxLength={operation === 'EXPORT' ? 450 : 500} required={operation !== 'EXPORT' || reason === 'Khác'} onChange={(event) => setNote(event.target.value)}
                placeholder={operation === 'IMPORT' ? 'Ví dụ: nhận 24 chai nước từ kho tổng, chứng từ NK012' : operation === 'STOCKTAKE' ? 'Ví dụ: kiểm kê cuối ca ngày 10/11' : 'Ví dụ: 2 chai bị vỡ trong ca chiều'} />
            </fieldset>
            {selectedFood && <div className="inventory-preview" aria-live="polite">
              <div><span>Tồn hiện tại</span><strong>{formatStock(selectedFood.stockQuantity)}</strong></div>
              <div><span>{operation === 'STOCKTAKE' && untracked ? 'Ghi nhận ban đầu' : 'Thay đổi'}</span><strong>{nextStock == null ? '—' : `${nextStock - (selectedFood.stockQuantity ?? 0) > 0 ? '+' : ''}${nextStock - (selectedFood.stockQuantity ?? 0)}`}</strong></div>
              <div><span>Tồn sau khi lưu</span><strong>{nextStock ?? '—'}</strong></div>
            </div>}
            {stockError && <p className="error-message" role="alert">{nextStock < 0 ? 'Số lượng xuất vượt quá tồn kho hiện tại.' : 'Số tồn vượt giới hạn cho phép.'}</p>}
            <button className="btn btn-primary" type="submit" disabled={!canSave}>{saving ? 'Đang lưu...' : `Xác nhận ${typeLabels[operation].toLowerCase()}`}</button>
          </form>
        </section>
        <section className="admin-table-card">
          <div className="table-header"><div><h2 className="section-title">Tồn kho hiện tại</h2><p className="inventory-help">{foods.length} mặt hàng · {foods.filter((food) => food.lowStock).length} mặt hàng chạm ngưỡng cảnh báo</p></div>
            <input className="input" aria-label="Tìm mặt hàng" placeholder="Tìm mặt hàng..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className="inventory-table-scroll"><table className="admin-table">
            <thead><tr><th>Mặt hàng</th><th>Tồn</th><th>Ngưỡng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan="5">Đang tải...</td></tr> : !visibleFoods.length ? <tr><td colSpan="5">Không có mặt hàng phù hợp.</td></tr> : visibleFoods.map((food) => <tr key={food.id}>
              <td>{food.name}{food.active === false && <small className="inventory-help"> · Ngừng bán</small>}</td><td>{formatStock(food.stockQuantity)}</td><td>{food.lowStockThreshold ?? '—'}</td>
              <td><span className={`status-badge ${food.stockQuantity === 0 ? 'status--inactive' : food.lowStock || food.stockQuantity == null ? 'status--pending' : 'status--active'}`}>{food.stockQuantity == null ? 'Chưa kiểm kê' : food.stockQuantity === 0 ? 'Hết hàng' : food.lowStock ? 'Sắp hết' : 'Còn hàng'}</span></td>
              <td><button className="btn btn-secondary btn-sm" disabled={saving || loading} onClick={() => { setSelectedFoodId(String(food.id)); setQuantity(''); if (food.stockQuantity == null) setOperation('STOCKTAKE'); }}>Chọn</button></td>
            </tr>)}</tbody>
          </table></div>
          <p className="inventory-footnote">Số lượng tính theo đơn vị bán của từng mặt hàng. Combo được theo dõi riêng, chưa quy đổi nguyên liệu.</p>
        </section>
      </div>
      <section className="admin-table-card">
        <div className="table-header"><div><h2 className="section-title">Lịch sử kho</h2><p className="inventory-help">Lọc trong tối đa 200 giao dịch gần nhất. Nếu ghi sai, lập phiếu kiểm kê để đối chiếu.</p></div></div>
        <div className="inventory-history-filters">
          <select className="input" aria-label="Lọc lịch sử theo mặt hàng" value={historyFoodId} onChange={(event) => setHistoryFoodId(event.target.value)}><option value="">Tất cả mặt hàng</option>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</select>
          <select className="input" aria-label="Lọc loại giao dịch" value={historyType} onChange={(event) => setHistoryType(event.target.value)}><option value="">Tất cả loại giao dịch</option>{Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select>
          <input className="input" type="date" aria-label="Lọc ngày giao dịch" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} />
          <button className="btn btn-secondary" onClick={() => { setHistoryFoodId(''); setHistoryType(''); setHistoryDate(''); }}>Xóa bộ lọc</button>
        </div>
        <div className="inventory-table-scroll"><table className="admin-table">
          <thead><tr><th>Phiếu / thời gian</th><th>Mặt hàng</th><th>Loại</th><th>Trước</th><th>Thay đổi</th><th>Sau</th><th>Người ghi nhận</th><th>Lý do / tham chiếu</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="8">Đang tải...</td></tr> : !visibleTransactions.length ? <tr><td colSpan="8">Không có giao dịch phù hợp trong lịch sử gần nhất.</td></tr> : visibleTransactions.map((tx) => <tr key={tx.transactionId}>
            <td><strong>#{tx.transactionId}</strong><div>{formatDateTime(tx.createdAt)}</div></td><td>{tx.foodName}</td><td>{typeLabels[tx.type] || tx.type}</td><td>{formatStock(tx.quantityBefore)}</td>
            <td style={{ fontWeight: 700 }}>{Number(tx.quantityChange) > 0 ? '+' : ''}{tx.quantityChange}</td><td>{formatStock(tx.quantityAfter)}</td><td>{tx.createdByUsername || 'Hệ thống'}</td>
            <td>{tx.note || '—'}{tx.referenceId && <div className="inventory-help">{tx.referenceType === 'Booking' ? 'Đơn hàng' : tx.referenceType} #{tx.referenceId}</div>}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <p className="inventory-footnote">Đơn bán trừ tồn khi thanh toán thành công. Hoàn tiền không tự nhập lại hàng; chỉ ghi nhận nhập lại khi đã nhận và kiểm tra hàng thực tế.</p>
    </div>
  );
};

export default InventoryManagementPage;
