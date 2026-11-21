# ADR-0001: Refresh token lưu trong Redis và chỉ dùng được một lần

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-21 (ghi lại quyết định đã áp dụng)
- **Liên quan:** `JwtService`, `AuthService`, `JwtAuthenticationFilter`; commit `7da48ab`, `4319c45`; [conventions.md](../04-api/conventions.md#xác-thực)

## Bối cảnh

Frontend là SPA giữ token trong localStorage, gọi API bằng header Bearer. Access token cần ngắn hạn để giảm thiệt hại khi bị lộ, nhưng người dùng không muốn đăng nhập lại mỗi 30 phút. Phiên bản cũ dùng entity `RedisToken` và không phân biệt access với refresh token, nên một refresh token bị lộ có thể dùng mãi tới khi hết hạn, và refresh token đặt vào header vẫn được chấp nhận như access token.

Yêu cầu:

- Đăng xuất phải có hiệu lực ngay, kể cả với access token chưa hết hạn.
- Refresh token bị đánh cắp phải bị phát hiện hoặc vô hiệu sớm.
- Nhiều tab, nhiều request đồng thời không được làm người dùng bị đăng xuất ngoài ý muốn.

## Quyết định

- Access token sống 30 phút, refresh token sống 30 ngày, cùng ký HS512. Mỗi token có claim `token_use` (`access` hoặc `refresh`) và `jti` riêng. Hai loại không dùng thay nhau.
- Refresh token đang hiệu lực được lưu ở Redis `auth:refresh:active:{jti}` với giá trị là username, TTL bằng thời gian sống còn lại.
- `POST /auth/refresh` xóa key bằng một Lua script compare-and-delete (chỉ xóa khi giá trị đúng `sub`), rồi cấp và lưu cặp mới. Chỉ request nào xóa được key mới nhận cặp mới.
- Đăng xuất xóa phiên refresh theo cùng cách và đưa `jti` của access token vào `auth:access:revoked:{jti}` tới khi token hết hạn.
- Chữ ký, thuật toán và claim bắt buộc được kiểm tra trước mọi truy cập Redis.
- Frontend gộp các 401 đồng thời vào một lần refresh để không tự tiêu thụ token hai lần.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Refresh token một lần, lưu Redis (đã chọn) | Đăng xuất có hiệu lực ngay. Token bị lộ chỉ dùng được một lần. Redis đã có sẵn cho giữ ghế. | Phụ thuộc Redis. Mất Redis là mọi người phải đăng nhập lại. Client phải xử lý refresh đồng thời. |
| JWT thuần không trạng thái | Đơn giản, không cần lưu trữ | Không thu hồi được token trước khi hết hạn |
| Refresh token lưu trong bảng MySQL | Bền vững | Thêm ghi DB ở mỗi lần refresh. Cần job dọn bản ghi hết hạn. |
| Cookie phiên `HttpOnly` thay cho JWT | Tránh lộ token qua JavaScript | Phải bật CSRF, xử lý cookie cross-origin giữa cổng 5173 và 8081, viết lại xác thực |

## Hệ quả

- Token phát hành trước khi có `token_use` bị từ chối. Người dùng phải đăng nhập lại sau khi triển khai.
- Request dùng lại một refresh token đã tiêu thụ nhận 401 và bị đưa về trang đăng nhập.
- Đăng xuất chỉ kết thúc phiên hiện tại. Chưa có chỉ mục phiên theo tài khoản nên không có chức năng "đăng xuất mọi thiết bị".
- Token vẫn nằm trong localStorage, nên lỗ hổng XSS vẫn đọc được token. Rủi ro này được chấp nhận ở phạm vi đồ án.
