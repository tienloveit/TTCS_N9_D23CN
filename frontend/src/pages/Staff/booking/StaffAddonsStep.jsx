import { useState } from 'react';
import Button from '../../../components/Common/Button';
import { PopcornIcon } from '../../../components/Common/CinemaIcons';
import { formatCurrency } from './staffBookingUtils';

/** Ảnh món: ảnh lỗi hoặc không có thì hiện icon, không để biểu tượng ảnh hỏng. */
function FoodThumb({ src, alt }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <PopcornIcon size={24} aria-hidden="true" />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />;
}

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
    <div className="card food-select-card pos-addons">
      <div className="food-select-header">
        <div>
          <h2>Chọn bắp nước và combo</h2>
          <p>Thêm nhanh đồ ăn kèm vào hóa đơn tại quầy (có thể bỏ qua nếu khách không mua).</p>
        </div>
        <div className="pos-addons-summary">
          {foodTotal > 0 && <strong>{formatCurrency(foodTotal)}</strong>}
          {foodQuantity > 0 && (
            <Button size="sm" onClick={() => setSelectedFoods({})}>Xóa bắp nước</Button>
          )}
        </div>
      </div>

      {foodError && <div className="error-message pos-addons-error" role="alert">{foodError}</div>}

      <div className="food-select-grid">
        {foods.map((food) => {
          const quantity = selectedFoods[food.id] || 0;
          const limited = food.stockQuantity != null;
          const soldOut = limited && food.stockQuantity <= 0;
          const atLimit = limited && quantity >= food.stockQuantity;

          return (
            <div key={food.id} className={`food-option ${quantity > 0 ? 'food-option--selected' : ''}`}>
              <div className="food-option-media">
                <FoodThumb src={food.imageUrl} alt={food.name} />
              </div>
              <div className="food-option-body">
                <h3>{food.name}</h3>
                {food.description && <p>{food.description}</p>}
                <strong>{formatCurrency(food.price)}</strong>
                {limited && (
                  <small className={'pos-food-stock' + (soldOut ? ' pos-food-stock--out' : '')}>
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
                  −
                </button>
                <span aria-live="polite">{quantity}</span>
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
