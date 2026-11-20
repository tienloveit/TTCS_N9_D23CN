import { PopcornIcon } from '../../../components/Common/CinemaIcons';
import { formatCurrency } from './staffBookingUtils';

/** Bước 3: chọn bắp nước và combo. */
export default function StaffAddonsStep({
  foodError,
  foodQuantity,
  foodTotal,
  foods,
  selectedFoods,
  setSelectedFoods,
  submitting,
  updateFoodQuantity,
}) {
  return (
    <div className="card food-select-card" style={{ marginTop: 0 }}>
      <div className="food-select-header">
        <div>
          <h2>Chọn bắp nước & Combo</h2>
          <p>Thêm nhanh đồ ăn kèm vào hóa đơn tại quầy (có thể bỏ qua nếu khách không mua).</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {foodTotal > 0 && <strong>{formatCurrency(foodTotal)}</strong>}
          {foodQuantity > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setSelectedFoods({})}
            >
              Xóa bắp nước
            </button>
          )}
        </div>
      </div>

      {foodError && (
        <div className="error-message" style={{ marginBottom: 16 }}>
          {foodError}
        </div>
      )}

      <div className="food-select-grid">
        {foods.map((food) => {
          const quantity = selectedFoods[food.id] || 0;
          const limited = food.stockQuantity != null;
          const soldOut = limited && food.stockQuantity <= 0;
          const atLimit = limited && quantity >= food.stockQuantity;

          return (
            <div
              key={food.id}
              className={`food-option ${quantity > 0 ? 'food-option--selected' : ''}`}
            >
              <div className="food-option-media">
                {food.imageUrl ? (
                  <img src={food.imageUrl} alt={food.name} />
                ) : (
                  <PopcornIcon size={24} />
                )}
              </div>
              <div className="food-option-body">
                <h3>{food.name}</h3>
                {food.description && <p>{food.description}</p>}
                <strong>{formatCurrency(food.price)}</strong>
                {limited && (
                  <small style={{ display: 'block', color: soldOut ? '#ef4444' : 'var(--text-muted)' }}>
                    {soldOut ? 'Hết hàng' : `Còn ${food.stockQuantity} phần`}
                  </small>
                )}

              </div>
              <div className="food-stepper">
                <button
                  type="button"
                  aria-label={`Giảm số lượng ${food.name}`}
                  onClick={() => updateFoodQuantity(food.id, -1)}
                  disabled={quantity === 0 || submitting}
                >
                  -
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  aria-label={`Tăng số lượng ${food.name}`}
                  onClick={() => updateFoodQuantity(food.id, 1)}
                  disabled={submitting || soldOut || atLimit}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
