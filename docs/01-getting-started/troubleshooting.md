# Xử lý lỗi khi chạy local

> Đối chiếu mã nguồn ngày 2026-11-25, nhánh `fix/backend-review-cleanup` (tách từ commit `7105c25`).

## Khởi động backend

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `Could not resolve placeholder 'JWT_SECRET_KEY'` (hoặc `SPRING_MAIL_USERNAME`, `VNPAY_TMN_CODE`...) | Thiếu biến bắt buộc trong `backend/.env` | Điền đủ biến theo [configuration.md](configuration.md). Dùng giá trị giả cho dịch vụ chưa cần thử. |
| `invalid target release: 21` | Maven chạy bằng JDK cũ | `java -version` phải là 21. Đặt `JAVA_HOME` trỏ tới JDK 21 rồi mở terminal mới. |
| `Access denied for user 'root'@'localhost'` | Sai user hoặc mật khẩu MySQL | Kiểm tra `SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_USERNAME`. |
| `Unknown database 'cinema'` | Chưa tạo schema | Chạy lệnh `CREATE DATABASE` ở [run-local.md](run-local.md#1-tạo-schema-mysql). |
| `Unable to connect to Redis` / `Connection refused: localhost:6379` | Redis chưa chạy | `redis-cli ping`. Bật Redis hoặc chạy container ở [requirements.md](requirements.md#dùng-docker-cho-mysql-và-redis). |
| `Port 8081 was already in use` | Còn một tiến trình backend khác | Tắt tiến trình đó (`Get-NetTCPConnection -LocalPort 8081` trên Windows), hoặc đặt `SERVER_PORT` và `VITE_API_BASE_URL` theo cổng mới. |
| `Schema-validation: missing column` / `wrong column type` | Entity và schema lệch nhau | Thêm migration mới theo [add-migration.md](../07-development/how-to/add-migration.md). Không sửa bảng bằng tay, không bật `ddl-auto: update`. |
| `Validate failed: Migration checksum mismatch for migration version N` | Một file migration đã chạy bị sửa | Hoàn lại nội dung file như lúc đã chạy (`git checkout -- <file>`). Đưa thay đổi vào migration mới. Chỉ dùng `flyway repair` khi chắc chắn database đúng với nội dung file mới. |
| `Detected failed migration to version 2` hoặc thông báo `SIGNAL` từ V2 (mã QR trùng, chi nhánh không tồn tại...) | Dữ liệu cũ vi phạm ràng buộc V2 cần siết | Sửa dữ liệu theo thông báo, chạy `DELETE FROM flyway_schema_history WHERE success = 0;` rồi khởi động lại. Xem [migrations.md](../05-database/migrations.md#khi-migration-dừng-giữa-chừng). |
| Maven dừng ở `spotless:check` | Code Java chưa đúng định dạng | `.\mvnw.cmd spotless:apply` rồi build lại. |
| `Spotless ... ratchetFrom ... not found` | Clone thiếu lịch sử Git | Clone lại không dùng `--depth`, hoặc `git fetch --unshallow`. |

## Frontend và kết nối API

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| DevTools báo `blocked by CORS policy` | Frontend chạy ở origin không nằm trong danh sách CORS | Dùng `localhost` hoặc `127.0.0.1` ở cổng 5173, 5174, 3000. Thêm origin mới vào biến `APP_CORS_ALLOWED_ORIGINS` trong `backend/.env` rồi khởi động lại backend. |
| Mọi API trả 404 | `VITE_API_BASE_URL` thiếu hậu tố `/api` | Sửa thành `http://localhost:8081/api` rồi khởi động lại Vite. |
| Sửa `.env` frontend nhưng không có tác dụng | Vite chỉ đọc `.env` lúc khởi động | Dừng và chạy lại `npm run dev`. |
| Đăng nhập xong bị đẩy về `/login` liên tục | Refresh token không còn hợp lệ, ví dụ sau khi đổi `JWT_SECRET_KEY` hoặc xóa Redis | Xóa `accessToken`, `refreshToken` trong localStorage rồi đăng nhập lại. |
| API trả 401 với token cũ sau khi cập nhật backend | Token phát hành trước khi có claim `token_use` bị từ chối | Đăng nhập lại. |
| Sơ đồ ghế không tự cập nhật | Kết nối SockJS tới `/api/ws` thất bại | Kiểm tra tab Network có request `ws/info`. Xem [realtime.md](../04-api/realtime.md#mất-kết-nối). |
| `npm ci` báo `EBADENGINE` hoặc Vite không chạy | Node quá cũ | Cài Node 20.19+ hoặc 22.12+. |
| `npm run lint` thất bại ở `lint:tokens` | Thêm mã màu hex ngoài `tokens.css` | Dùng `var(--...)`. Xem [coding-conventions.md](../07-development/coding-conventions.md#frontend). |

## Tích hợp

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| VNPay báo "Sai chữ ký" khi mở URL thanh toán | `VNPAY_SECRET_KEY` hoặc `VNPAY_TMN_CODE` sai, hoặc có khoảng trắng thừa | Sao chép lại từ email sandbox. Xem [vnpay.md](../06-integrations/vnpay.md#lỗi-thường-gặp). |
| Trang kết quả thanh toán báo `code: 97` | Chữ ký callback không khớp, thường do sửa query string hoặc khóa sai | Như trên. Không tự sửa tham số trên URL trả về. |
| Thanh toán xong nhưng đơn vẫn chờ, chỉ khi thử bằng điện thoại | URL trả về `localhost` chỉ mở được trên máy chạy frontend, còn IPN không tới được máy local | Thử trên cùng máy, hoặc dùng tunnel cho IPN. Xem [vnpay.md](../06-integrations/vnpay.md#thử-ipn-ở-máy-local). |
| Quay về sai địa chỉ sau VNPay hoặc Google | Đổi địa chỉ frontend nhưng chưa đổi cấu hình | Cập nhật `VNPAY_RETURN_URL`, `APP_OAUTH2_SUCCESS_URL`, `APP_OAUTH2_FAILURE_URL`. Đổi địa chỉ backend thì cập nhật cả redirect URI trên Google Cloud. |
| Google báo `redirect_uri_mismatch` | Redirect URI chưa đăng ký | Thêm `http://localhost:8081/api/login/oauth2/code/google`. Xem [google-oauth.md](../06-integrations/google-oauth.md). |
| Quên mật khẩu báo lỗi 500, log có `AuthenticationFailedException` | Gmail từ chối đăng nhập SMTP | Dùng App Password thay mật khẩu tài khoản. Xem [email.md](../06-integrations/email.md). |
| Quên mật khẩu trả 429 | Gửi OTP quá 5 lần cho cùng email trong khoảng 1 phút | Đợi 1 phút không gửi thêm rồi thử lại. |
| Không nhận được email vé | Tài khoản không có email, gửi mail lỗi, hoặc đơn được tạo bằng SQL | Xem log `Could not send ticket email`. Việc gửi vé chạy sau commit nên lỗi mail không làm hỏng đơn. |

## IDE

| Triệu chứng | Cách sửa |
| --- | --- |
| VS Code báo lỗi Java trong `.tmp` | Đóng các tab từ thư mục tạm, thêm `**/.tmp/**` vào `java.import.exclusions`, rồi tải lại cửa sổ. Project Maven của ứng dụng là `backend/pom.xml`. |
| IDE không báo lỗi định dạng mà Maven báo | Bộ import Maven trong VS Code bỏ qua bước `validate`, nơi Spotless chạy. Chạy `mvnw` bằng JDK 21 trong `backend/`. |
| Class MapStruct bị cũ hoặc trộn với build của IDE | Tách output: `.\mvnw.cmd "-Dbackend.build.directory=target/verification" test`. |
