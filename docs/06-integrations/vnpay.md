# Tích hợp VNPay

> Đối chiếu mã nguồn ngày 2026-11-25, nhánh `fix/backend-review-cleanup` (tách từ commit `7105c25`).

Dự án dùng môi trường sandbox của VNPay, API phiên bản `2.1.0`. Quy tắc nghiệp vụ (khi nào xuất vé, khi nào hoàn) nằm trong [payment-refund.md](../02-domain/payment-refund.md). File này mô tả phần kỹ thuật.

| Thành phần | File |
| --- | --- |
| Tạo URL thanh toán, truy vấn giao dịch, hoàn tiền trực tiếp | [VnpayService.java](../../backend/src/main/java/com/ltweb/backend/service/VnpayService.java) |
| Xử lý return URL và IPN | [VnpayCallbackService.java](../../backend/src/main/java/com/ltweb/backend/service/VnpayCallbackService.java) |
| Gửi và xác minh lệnh hoàn tiền, truy vấn kết quả hoàn | [VnpayRefundGateway.java](../../backend/src/main/java/com/ltweb/backend/service/VnpayRefundGateway.java) |
| HMAC-SHA512, mã hóa tham số | [VnpayUtil.java](../../backend/src/main/java/com/ltweb/backend/util/VnpayUtil.java) |
| Endpoint | [VnpayController.java](../../backend/src/main/java/com/ltweb/backend/controller/VnpayController.java) |
| Trang thanh toán và kết quả | `frontend/src/pages/Payment/` |

## Đăng ký sandbox

1. Đăng ký tài khoản merchant thử nghiệm tại trang sandbox của VNPay (`https://sandbox.vnpayment.vn/devreg/`).
2. VNPay gửi email chứa **Terminal ID** (`vnp_TmnCode`), **Secret Key** (`vnp_HashSecret`) và tài khoản đăng nhập trang quản trị merchant sandbox.
3. Điền vào `backend/.env`:

   ```dotenv
   VNPAY_TMN_CODE=<Terminal ID>
   VNPAY_SECRET_KEY=<Secret Key>
   ```

`VNPAY_SECRET_KEY` là bí mật. Ai có khóa này có thể giả callback thanh toán thành công. Không commit, không dán vào tài liệu hay tin nhắn nhóm.

## Cấu hình

| Khóa (`application.yaml`) | Biến môi trường | Giá trị mặc định |
| --- | --- | --- |
| `vnpay.tmn-code` | `VNPAY_TMN_CODE` | Bắt buộc |
| `vnpay.secret-key` | `VNPAY_SECRET_KEY` | Bắt buộc |
| `vnpay.pay-url` | `VNPAY_PAY_URL` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| `vnpay.api-url` | `VNPAY_API_URL` | `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction` |
| `vnpay.return-url` | `VNPAY_RETURN_URL` | `http://localhost:5173/payment/vnpay-return` |

Khi chuyển sang môi trường thật, đổi cả `pay-url`, `api-url` và dùng mã merchant thật.

## Tạo URL thanh toán

`POST /v1/vnpay/payment-url` với `{bookingId}`. Backend dựng các tham số:

| Tham số | Giá trị |
| --- | --- |
| `vnp_Version`, `vnp_Command` | `2.1.0`, `pay` |
| `vnp_TmnCode` | Từ cấu hình |
| `vnp_Amount` | `Payment.amount × 100`, số nguyên (VNPay tính theo đơn vị nhỏ nhất) |
| `vnp_CurrCode`, `vnp_Locale` | `VND`, `vn` (hoặc `language` client gửi) |
| `vnp_TxnRef` | ID đơn (`bookings.id`) |
| `vnp_OrderInfo`, `vnp_OrderType` | `Thanh toán đơn hàng:<id>`, `other` |
| `vnp_BankCode` | Tùy chọn, client gửi |
| `vnp_ReturnUrl` | `vnpay.return-url` |
| `vnp_IpAddr` | Header `X-FORWARDED-FOR`, hoặc địa chỉ kết nối |
| `vnp_CreateDate` | `Payment.paymentCreatedAt`, định dạng `yyyyMMddHHmmss` giờ rạp |
| `vnp_ExpireDate` | `Booking.expiresAt`, cùng định dạng |

Ký URL:

1. Sắp xếp tên tham số theo thứ tự bảng chữ cái, bỏ tham số rỗng.
2. Dựng chuỗi `ten=gia_tri_da_ma_hoa` nối bằng `&`. Giá trị mã hóa bằng `URLEncoder` với bảng mã US-ASCII (dấu cách thành `+`).
3. `vnp_SecureHash = HMAC-SHA512(secretKey, chuỗi trên)`, dạng hex chữ thường.
4. URL = `pay-url?<query>&vnp_SecureHash=<hash>`.

`vnp_CreateDate` dùng lại `paymentCreatedAt` đã lưu để lệnh truy vấn và hoàn tiền sau này gửi đúng `vnp_TransactionDate` của giao dịch gốc.

## Kiểm chữ ký callback

Return URL và IPN gửi cùng bộ tham số. `VnpayCallbackService.verifyCallback`:

1. Bỏ `vnp_SecureHash` và `vnp_SecureHashType`.
2. Sắp xếp tên tham số, bỏ giá trị rỗng, mã hóa **cả tên và giá trị** rồi nối `ten=gia_tri` bằng `&`.
3. So `HMAC-SHA512(secretKey, chuỗi)` với `vnp_SecureHash`, không phân biệt hoa thường.

Sau khi chữ ký hợp lệ, backend mới tìm đơn và so số tiền. Bảng `RspCode` và cách xử lý từng tình huống ở [payment-refund.md](../02-domain/payment-refund.md#return-và-ipn).

## Return URL và IPN

| | Return URL | IPN |
| --- | --- | --- |
| Ai gọi | Trình duyệt của khách, sau khi trả tiền | Máy chủ VNPay gọi thẳng backend |
| Địa chỉ | `vnp_ReturnUrl` gửi trong URL thanh toán: `http://localhost:5173/payment/vnpay-return` | Khai báo với VNPay cho mã merchant: `https://<domain>/api/v1/vnpay/ipn` |
| Backend nhận ở | `GET /v1/vnpay/return` (frontend chuyển tiếp nguyên query string) | `GET /v1/vnpay/ipn` |
| Đảm bảo | Không. Khách có thể đóng trình duyệt. | VNPay gửi lại nếu không nhận được phản hồi hợp lệ. |

Hai đường dùng chung một hàm xử lý và cùng khóa dòng booking, nên đường tới sau nhận `02` (đã xác nhận) và không ghi nhận hai lần. Mọi callback được ghi vào `payment_events`, kể cả sai chữ ký. Bảng này không lưu `vnp_SecureHash`.

### Thử IPN ở máy local

VNPay không gọi được `localhost`, nên ở máy local chỉ có Return URL hoạt động. Như vậy là đủ cho phần lớn kịch bản thử, vì Return URL đi qua cùng hàm xử lý với IPN.

Khi cần thử đúng đường IPN (khách đóng trình duyệt, thanh toán trễ):

1. Mở tunnel tới backend, ví dụ `cloudflared tunnel --url http://localhost:8081` hoặc `ngrok http 8081`.
2. Khai báo IPN URL `https://<địa-chỉ-tunnel>/api/v1/vnpay/ipn` trên trang quản trị merchant sandbox.
3. Thanh toán rồi đóng tab trước khi VNPay chuyển về. Đơn vẫn chuyển `COMPLETED` nhờ IPN.

Cách nhanh hơn để thử tính idempotent: sao chép query string trên trang `/payment/vnpay-return`, gọi `GET http://localhost:8081/api/v1/vnpay/ipn?<query string>`. Lần gọi này có chữ ký hợp lệ và phải trả `{"RspCode":"02"}`.

### Thẻ test

Trang thanh toán sandbox chấp nhận thẻ nội địa thử nghiệm của ngân hàng NCB do VNPay công bố trong tài liệu sandbox:

| Trường | Giá trị |
| --- | --- |
| Ngân hàng | NCB |
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | `NGUYEN VAN A` |
| Ngày phát hành | `07/15` |
| OTP | `123456` |

Nếu VNPay đổi dữ liệu thử, xem lại trong email đăng ký hoặc trang tài liệu sandbox. Để thử thanh toán thất bại, bấm "Hủy giao dịch" trên trang VNPay (`vnp_ResponseCode = 24`).

## Truy vấn và hoàn tiền

Hai lệnh gửi `POST` JSON tới `vnpay.api-url`. RestTemplate có timeout kết nối 5 giây và đọc 15 giây (`AppConfig`).

| Lệnh | `vnp_Command` | Tham số đáng chú ý |
| --- | --- | --- |
| Truy vấn | `querydr` | `vnp_TxnRef` (ID đơn), `vnp_TransactionDate` (`paymentCreatedAt`) |
| Hoàn tiền | `refund` | Thêm `vnp_TransactionType = 02` (hoàn toàn phần), `vnp_Amount`, `vnp_TransactionNo` (`providerTxnId`), `vnp_CreateBy` (username người duyệt) |

`vnp_RequestId` của lệnh hoàn là `refundRequestId` đã lưu ở `payments` trước khi gửi, nên một lần thử luôn có cùng mã. Chữ ký của request và response là HMAC-SHA512 trên các trường nối bằng `|` theo thứ tự cố định của đặc tả [querydr & refund](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html). Thứ tự này khác cách ký URL thanh toán.

`VnpayRefundGateway` chỉ coi là hoàn thành công khi phản hồi có chữ ký hợp lệ, đúng `vnp_TmnCode`, `vnp_TxnRef`, `vnp_Command`, `vnp_Amount`, có `vnp_ResponseId`, và `vnp_ResponseCode = 00`, `vnp_TransactionType = 02`, `vnp_TransactionStatus = 00`, có `vnp_TransactionNo`.

| Phản hồi | Trạng thái lần hoàn |
| --- | --- |
| Đạt mọi điều kiện trên | `SUCCEEDED` |
| Lệnh `refund` với mã `02`, `03`, `04`, `08`, `13`, `91`, `93`, `95`, `97`, hoặc `TransactionStatus = 09` | `FAILED`, cho phép thử lại |
| Sai chữ ký, sai đơn, timeout, mã `94`/`98`/`99`, trạng thái `05`/`06`, hoặc chỉ thấy giao dịch thanh toán gốc (loại `01`) | `UNKNOWN`, lần sau chỉ truy vấn |

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| Trang VNPay báo "Sai chữ ký" | `VNPAY_SECRET_KEY` hoặc `VNPAY_TMN_CODE` sai, có khoảng trắng thừa | Sao chép lại từ email, khởi động lại backend |
| Trang VNPay báo giao dịch quá thời gian chờ | Đã quá `vnp_ExpireDate` (hết thời gian giữ ghế) | Tạo đơn mới |
| Trang kết quả hiện `code: 97` | Query string bị sửa, hoặc khóa ký ở backend khác khóa đã ký URL | Không sửa URL trả về. Kiểm tra cấu hình. |
| IPN trả `04` | Số tiền callback khác `Payment.amount`, thường do đổi mã khuyến mãi sau khi lấy URL | Backend đã chặn đổi mã sau khi cấp URL. Nếu gặp với dữ liệu cũ, tạo URL mới. |
| Thanh toán xong trên điện thoại nhưng không về được trang kết quả | Return URL là `localhost` | Thử trên máy chạy frontend, hoặc dùng tunnel cho frontend và đổi `VNPAY_RETURN_URL` |
| Hoàn tiền mãi ở `UNKNOWN` | Sandbox không trả xác nhận hoàn | Bấm "Kiểm tra kết quả". Nếu vẫn chưa rõ, đối soát trên trang quản trị merchant, không sửa tay marker trong DB. |
