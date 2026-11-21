import { useState } from 'react';
import Button from '../../../components/Common/Button';
import { PopcornIcon } from '../../../components/Common/CinemaIcons';
import { formatCurrency } from './staffBookingUtils';

/** Ảnh món: ảnh lỗi hoặc không có thì hiện icon, không để biểu tượng ảnh hỏng. */
function FoodThumb({ src, alt }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <PopcornIcon size={22} aria-hidden="true" />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />;
}

/** Tab bắp nước ở bước chọn ghế: thêm nhanh đồ ăn kèm vào phiếu, không bắt buộc. */
export default function StaffAddonsStep({
  foodError,
  foodQuantity,
  foods,
  selectedFoods,
  setSelectedFoods,
  submitting,
  updateFoodQuantity,
}) {
  return (
    <section className="counter-card counter-food" aria-label="Bắp nước">
      <div className="counter-section-head">
        <h2>Bắp nước kèm</h2>
        {foodQuantity > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setSelectedFoods({})}>Xóa bắp nước</Button>
        ) : (
          <span>Không bắt buộc. Tồn kho được kiểm tra khi thu tiền.</span>
        )}
      </div>

      {foodError && <div className="error-message" role="alert">{foodError}</div>}
      {!foodError && foods.length === 0 && <p className="counter-muted">Chi nhánh chưa có món nào đang bán.</p>}

      <div className="counter-food-grid">
        {foods.map((food) => {
          const quantity = selectedFoods[food.id] || 0;
          const limited = food.stockQuantity != null;
          const soldOut = limited && food.stockQuantity <= 0;
          const atLimit = limited && quantity >= food.stockQuantity;
          const stockTone = soldOut ? ' counter-food-stock--out' : limited && food.stockQuantity <= 3 ? ' counter-food-stock--low' : '';
          return (
            <div key={food.id} className={'counter-food-item' + (quantity > 0 ? ' is-selected' : '') + (soldOut ? ' is-out' : '')}>
              <div className="counter-food-info">
                <span className="counter-food-thumb"><FoodThumb src={food.imageUrl} alt={food.name} /></span>
                <div>
                  <strong>{food.name}</strong>
                  <span>{formatCurrency(food.price)}</span>
                  <small className={'counter-food-stock' + stockTone}>
                    {!limited ? 'Còn hàng' : soldOut ? 'Hết hàng' : `Còn ${food.stockQuantity} phần`}
                  </small>
                </div>
              </div>
              <div className="counter-stepper">
                <button type="button" aria-label={`Giảm số lượng ${food.name}`}
                  onClick={() => updateFoodQuantity(food.id, -1)} disabled={quantity === 0 || submitting}>−</button>
                <output aria-live="polite">{quantity}</output>
                <button type="button" aria-label={`Tăng số lượng ${food.name}`}
                  onClick={() => updateFoodQuantity(food.id, 1)} disabled={submitting || soldOut || atLimit}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
