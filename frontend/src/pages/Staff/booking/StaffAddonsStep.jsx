import { useState } from 'react';
import { OpsButton } from '../../../components/Ops';
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
    <section className="o-counter-card o-counter-food" aria-label="Bắp nước">
      <div className="o-counter-section-head">
        <h2>Bắp nước kèm</h2>
        {foodQuantity > 0 ? (
          <OpsButton size="sm" variant="ghost" onClick={() => setSelectedFoods({})}>Xóa bắp nước</OpsButton>
        ) : (
          <span>Không bắt buộc. Tồn kho được kiểm tra khi thu tiền.</span>
        )}
      </div>

      {foodError && <div className="o-field__error" role="alert">{foodError}</div>}
      {!foodError && foods.length === 0 && <p className="o-counter-muted">Chi nhánh chưa có món nào đang bán.</p>}

      <div className="o-counter-food-grid">
        {foods.map((food) => {
          const quantity = selectedFoods[food.id] || 0;
          const limited = food.stockQuantity != null;
          const soldOut = limited && food.stockQuantity <= 0;
          const atLimit = limited && quantity >= food.stockQuantity;
          const stockTone = soldOut ? ' o-counter-food-stock--out' : limited && food.stockQuantity <= 3 ? ' o-counter-food-stock--low' : '';
          return (
            <div key={food.id} className="o-counter-food-item" data-selected={quantity > 0 || undefined} data-sold-out={soldOut || undefined}>
              <div className="o-counter-food-info">
                <span className="o-counter-food-thumb"><FoodThumb src={food.imageUrl} alt={food.name} /></span>
                <div>
                  <strong>{food.name}</strong>
                  <span>{formatCurrency(food.price)}</span>
                  <small className={'o-counter-food-stock' + stockTone}>
                    {!limited ? 'Còn hàng' : soldOut ? 'Hết hàng' : `Còn ${food.stockQuantity} phần`}
                  </small>
                </div>
              </div>
              <div className="o-counter-stepper">
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
