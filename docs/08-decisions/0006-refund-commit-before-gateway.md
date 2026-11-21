# ADR-0006: Hoàn tiền VNPay ghi lần thử trước khi gọi cổng

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-21 (ghi lại quyết định áp dụng từ script `20261112_refund_gateway_attempt`, nay nằm trong V2)
- **Liên quan:** `BookingRefundService`, `VnpayRefundGateway`, `payments.refund_*`, `payment_events`; [payment-refund.md](../02-domain/payment-refund.md#hoàn-qua-vnpay)

## Bối cảnh

Duyệt hoàn tiền VNPay phải gọi HTTP tới cổng. Lời gọi có thể mất tới 15 giây, timeout, trả phản hồi không xác thực được, hoặc thành công nhưng phản hồi không về tới server. Nếu vừa giữ khóa dòng booking vừa chờ mạng, các thao tác khác trên đơn bị chặn. Nếu không ghi lại đã gửi lệnh, quản lý bấm duyệt lần nữa sẽ gửi lệnh hoàn thứ hai và khách có thể được hoàn hai lần.

## Quyết định

Chia một lần duyệt thành ba bước:

1. **Transaction 1** (`REQUIRES_NEW`): khóa đơn, kiểm tra điều kiện, sinh `refundRequestId` mới, đặt `refundGatewayStatus = PROCESSING`, `refundRequestedAt`, người xử lý, rồi **commit**.
2. **Gọi cổng** ngoài mọi transaction, với `vnp_RequestId = refundRequestId`.
3. **Transaction 2** (`REQUIRES_NEW`): xóa persistence context, khóa đơn lại, ghi `payment_events`, chỉ áp kết quả nếu `refundRequestId` vẫn trùng lần thử đang chờ. Chỉ phản hồi có chữ ký và đúng mọi trường mới thành `SUCCEEDED` và hoàn tất đơn.

Lần duyệt tiếp theo dựa vào trạng thái đã lưu: `PROCESSING` dưới 60 giây thì chờ, `UNKNOWN` hoặc `PROCESSING` quá 60 giây thì chỉ gửi `querydr`, `FAILED` mới được gửi lệnh hoàn mới.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Ghi lần thử, gọi cổng, ghi kết quả (đã chọn) | Không giữ khóa khi chờ mạng. Không gửi trùng. Phục hồi được sau crash. | Thêm cột trạng thái lần thử. Đơn có thể kẹt ở `UNKNOWN` và cần đối soát tay. |
| Gọi cổng trong một transaction | Code đơn giản | Giữ khóa tới 15 giây. Rollback sau khi cổng đã hoàn thì mất dấu tiền đã trả. |
| Hàng đợi tin nhắn và worker | Tách hẳn khỏi request | Thêm hạ tầng (broker, worker) quá mức cần thiết cho đồ án |

## Hệ quả

- Giao diện không được báo thành công khi phản hồi API chưa là `REFUNDED`. Trạng thái trung gian hiện thông điệp và nút "Kiểm tra kết quả".
- Kết quả truy vấn chỉ thấy giao dịch thanh toán gốc không được coi là đã hoàn. Đơn có thể ở `UNKNOWN` lâu với sandbox, cần đối soát trên trang merchant.
- Không sửa tay `refund_gateway_status` để "gửi lại", vì có thể dẫn tới hoàn hai lần.
- Đơn `REFUNDED` có từ trước cơ chế này (marker null) không được coi là bằng chứng đã hoàn.
