# Hướng dẫn AI cho backend

Áp dụng cho `backend/`. Đọc [quy tắc toàn dự án](../AGENTS.md) và [context backend](CLAUDE.md) trước khi sửa. Khi thay đổi hợp đồng với UI, đối chiếu thêm [context frontend](../frontend/CLAUDE.md).

- Dùng GitNexus impact trước khi sửa symbol. Với luồng REST, đối chiếu controller, DTO, mapper, service và client tương ứng trong [frontend/src/api](../frontend/src/api).
- Giữ phân quyền ở backend. Kiểm tra role, trạng thái tài khoản, chủ sở hữu và chi nhánh theo đúng nghiệp vụ. Tái sử dụng `CurrentUserProvider`, `BookingAccessPolicy` và `RefundPolicy` tại các điểm phù hợp.
- Khi sửa giữ ghế, thanh toán, hoàn tiền hoặc tồn kho, kiểm tra khóa DB, chủ sở hữu khóa Redis, rollback, retry và xử lý sau commit. Tái sử dụng `BookingTransactionEffects` cho đường xử lý hiện có.
- Dùng `Clock` được inject cho nghiệp vụ phụ thuộc thời gian và `Clock.fixed` trong test thời gian. Kiểm tra hợp đồng JSON theo DTO/mapper, bao gồm các trường Payment phẳng trong `BookingResponse`.
- Làm việc trên source dưới `src/`. Tránh sửa mã MapStruct sinh trong `target/`. Khi sửa Java, dùng Spotless theo baseline của `pom.xml`.
- Đối chiếu entity, [schema khởi tạo](movie.sql) và [migration hiện có](migrations) khi sửa persistence. Chỉ chạy reset, seed hoặc migration ghi dữ liệu trong phạm vi được người dùng cho phép. Giữ bí mật trong cấu hình cục bộ.
- Chạy `.\mvnw.cmd test` từ `backend/` trên Windows hoặc `sh ./mvnw test` trên Linux/macOS. Chọn test nghiệp vụ liên quan khi cần chạy riêng. Kiểm thử persistence có yêu cầu database bản sao riêng, xem [context backend](CLAUDE.md#migration-và-kiểm-tra).
