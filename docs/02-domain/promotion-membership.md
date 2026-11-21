# Khuyến mãi và hạng thành viên

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

## Thứ tự tính giá

Backend tính giá ở `BookingPricingService`, frontend chỉ ước tính trong lúc chờ phản hồi:

1. **Tiền vé** = tổng `Ticket.price` của các ghế đã chọn. Mọi ghế trong một suất có cùng giá `Showtime.ticketPrice`.
2. **Tiền bắp nước** = tổng `Food.price × số lượng` của từng món.
3. **Giá gốc** = tiền vé + tiền bắp nước.
4. **Giảm giá** = `floor(giá gốc × discountPercent / 100)`, tối đa `maxDiscount` nếu mã có giới hạn.
5. **Tổng thanh toán** = `max(giá gốc − giảm giá, 0)`.

Mã khuyến mãi áp trên cả vé lẫn bắp nước. Một đơn chỉ có tối đa một mã. Tiền làm tròn xuống tới đồng.

## Khuyến mãi

Chỉ có một loại khuyến mãi: giảm theo phần trăm, có thể đặt mức giảm tối đa. Các thuộc tính của `Promotion`:

| Thuộc tính | Ý nghĩa |
| --- | --- |
| `code` | Mã duy nhất, lưu chữ hoa, so sánh không phân biệt hoa thường. |
| `discountPercent` | 0 tới 100. |
| `maxDiscount` | Số tiền giảm tối đa. Null là không giới hạn. |
| `minOrderAmount` | Giá gốc tối thiểu để áp mã. Mặc định 0. |
| `minMembershipTier` | Hạng tối thiểu của khách. Null là mọi hạng. |
| `branchId` | Chỉ áp cho suất ở chi nhánh này. Null là toàn hệ thống. |
| `startDate`, `endDate` | Khoảng hiệu lực. Null là không giới hạn ở đầu đó. |
| `usageLimit`, `usedCount` | Tổng số lượt được dùng và số lượt đã giữ hoặc đã dùng. `usageLimit` null là không giới hạn. |
| `active` | Xóa mã thực chất là đặt `active = false`. |

### Điều kiện áp mã

`PromotionService.validatePromotion` kiểm tra theo thứ tự, gặp lỗi đầu tiên thì dừng:

| Điều kiện | Lỗi khi không đạt |
| --- | --- |
| Mã tồn tại | `PROMOTION_NOT_FOUND` |
| `active = true` | `PROMOTION_EXPIRED` |
| Hiện tại nằm trong `[startDate, endDate]` | `PROMOTION_EXPIRED` |
| `usedCount < usageLimit` | `PROMOTION_USAGE_LIMIT` |
| Giá gốc ≥ `minOrderAmount` | `PROMOTION_MIN_ORDER` |
| Hạng của khách ≥ `minMembershipTier` | `PROMOTION_TIER_NOT_MET` |
| Mã toàn hệ thống, hoặc đúng chi nhánh của suất | `PROMOTION_EXPIRED` |

Với đơn tại quầy, hạng được tính theo tài khoản khách gắn với đơn, không phải nhân viên.

`GET /promotion/available` trả các mã khách đang đăng nhập có thể dùng (còn hiệu lực, còn lượt, đủ hạng). Danh sách này không lọc theo chi nhánh, nên một mã chi nhánh khác vẫn có thể bị từ chối khi áp. `POST /promotion/validate` kiểm tra mã mà không giữ lượt.

### Áp, đổi, bỏ mã cho đơn có sẵn

`PATCH /booking/{id}/apply-promotion` với `promotionCode`. Chuỗi rỗng là bỏ mã. Chỉ chủ đơn được gọi, và chỉ khi đơn `PENDING`, payment `PENDING`, chưa quá `expiresAt` và **chưa lấy URL VNPay**. Backend cộng lại giảm giá cũ để có giá gốc rồi tính lại từ đầu, nên không cộng dồn hai mã.

### Giữ lượt dùng

Lượt dùng được giữ ngay khi tạo đơn hoặc áp mã, bằng một câu `UPDATE` có điều kiện `used_count < usage_limit` (`PromotionRepository.reserveUsage`). Hai đơn đồng thời không thể cùng lấy lượt cuối cùng.

| Sự kiện | Lượt dùng |
| --- | --- |
| Tạo đơn có mã, hoặc áp mã | `usedCount + 1`, `promotionUsageReserved = TRUE` |
| Đổi mã | Trả lượt mã cũ, giữ lượt mã mới, trong cùng transaction. Giữ lượt mới lỗi thì việc trả lượt cũ cũng rollback. |
| Đơn bị hủy, hết hạn, VNPay thất bại, thanh toán trễ | Trả lượt (`usedCount − 1`, không xuống dưới 0) |
| Thanh toán thành công | Lượt giữ thành lượt đã dùng, `promotionUsageReserved = FALSE` |
| Hoàn tiền | Không trả lượt |

Đơn tạo trước khi có cơ chế này có `promotionUsageReserved` null và được tính lượt lúc thanh toán như cách cũ.

### Ai quản lý khuyến mãi

ADMIN tạo và sửa mọi mã. MANAGER chỉ tạo, sửa và tắt mã của chi nhánh mình (`branchId` luôn bị đặt về chi nhánh của MANAGER). MANAGER xem được cả mã toàn hệ thống nhưng không sửa.

## Hạng thành viên

| Hạng | Tên hiển thị | Tổng chi tiêu tối thiểu |
| --- | --- | --- |
| `BRONZE` | Đồng | 0 đ |
| `SILVER` | Bạc | 500.000 đ |
| `GOLD` | Vàng | 2.000.000 đ |
| `PLATINUM` | Bạch Kim | 5.000.000 đ |

Hạng luôn được tính lại từ `totalSpending` (`MembershipTier.fromSpending`), nên có thể lên hoặc xuống.

### Cập nhật sau thanh toán

Khi đơn được thanh toán (VNPay thành công hoặc tiền mặt tại quầy), backend phát `BookingPaidEvent`. `MembershipUpdateListener` nghe sự kiện **sau khi transaction commit**, chạy trong transaction mới:

1. Nếu đơn đã được xử lý (`spendingRecorded` khác null) thì bỏ qua, nên sự kiện lặp lại không cộng hai lần.
2. Đặt `spendingRecorded = TRUE`, chốt lượt khuyến mãi.
3. Khóa dòng user (`findByIdForUpdate`), cộng `totalAmount` của đơn (sau giảm giá) vào `totalSpending`, tính lại hạng.

Lỗi ở bước này chỉ được ghi log, không làm hỏng thanh toán. `DataConsistencyJob` chạy lúc 03:00 so sánh `totalSpending` với tổng các đơn đã cộng và ghi cảnh báo nếu lệch.

### Khi hoàn tiền

Đơn hoàn tất hoàn tiền bị trừ khỏi `totalSpending` (không xuống dưới 0) và hạng được tính lại. Đơn thanh toán trễ có `spendingRecorded = FALSE` vì chưa từng được cộng, nên không bị trừ.
