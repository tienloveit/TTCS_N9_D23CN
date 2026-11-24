# Hướng dẫn cho AI — MoviePTIT

> Đối chiếu mã nguồn ngày 2026-11-25, commit `3ae857c`.

MoviePTIT là hệ thống đặt vé cho chuỗi rạp nhiều chi nhánh: website khách hàng, quầy bán vé và khu quản trị. File này chỉ giữ lệnh, quy tắc bắt buộc và bản đồ điểm vào. Nghiệp vụ nằm trong [docs/02-domain](docs/02-domain/), cách làm việc với code nằm trong [docs/07-development](docs/07-development/), mục lục ở [docs/README.md](docs/README.md). Khi làm trong `backend/` hoặc `frontend/`, đọc thêm [backend/AGENTS.md](backend/AGENTS.md) hoặc [frontend/AGENTS.md](frontend/AGENTS.md).

## Lệnh

| Việc | Backend (chạy trong `backend/`) | Frontend (chạy trong `frontend/`) |
| --- | --- | --- |
| Chạy | `.\mvnw.cmd spring-boot:run` (cần MySQL, Redis) | `npm ci`, `npm run dev` |
| Test | `.\mvnw.cmd test` | `node --experimental-vm-modules --test tests/*.test.mjs` |
| Lint, định dạng | `.\mvnw.cmd spotless:apply` (Spotless cũng chạy trong `test`) | `npm run lint` |
| Build | `.\mvnw.cmd -DskipTests package` | `npm run build` |

Trên Linux/macOS thay `.\mvnw.cmd` bằng `sh ./mvnw`. Cài đặt và biến môi trường: [docs/01-getting-started](docs/01-getting-started/run-local.md).

## Quy tắc bắt buộc

- Giữ thay đổi trong phạm vi yêu cầu. Quy tắc với working tree và Git ở mục [Quy tắc Git](#quy-tắc-git).
- Quyền luôn được kiểm ở backend: role bằng `SecurityConfig` và `@PreAuthorize`, chủ sở hữu và chi nhánh trong service. Route guard ở frontend chỉ để điều hướng. Xem [roles-permissions.md](docs/02-domain/roles-permissions.md).
- Backend quyết định giá, hạn giữ ghế, tồn bắp nước và thời hạn hoàn. Frontend hiển thị giá trị backend trả về, không tự tính lại.
- Schema chỉ đổi bằng một file Flyway mới `V{n}__mo_ta.sql`. Không sửa migration đã phát hành, không bật `ddl-auto: update`. Xem [add-migration.md](docs/07-development/how-to/add-migration.md).
- Giữ hợp đồng JSON: frontend đọc `data.result`, các trường thanh toán vẫn phẳng trong `BookingResponse`. Đổi API thì đối chiếu controller, DTO, mapper, client Axios và mọi màn hình dùng dữ liệu đó. Xem [add-endpoint.md](docs/07-development/how-to/add-endpoint.md).
- Thời gian nghiệp vụ dùng giờ rạp `Asia/Ho_Chi_Minh`: `Clock` được inject ở backend, `src/utils/cinemaTime.js` ở frontend.
- Đổi setup, schema, API hay nghiệp vụ thì cập nhật file tương ứng trong `docs/` cùng commit và sửa dòng "Đối chiếu mã nguồn" của file đó. Mỗi chủ đề chỉ có một file nguồn, nơi khác chỉ link tới.
- Giữ bí mật trong `.env` cục bộ, tài liệu chỉ dùng tên biến. Seed, cleanup và script reset chỉ chạy trên database demo, sau khi người dùng cho phép.

## Quy tắc Git

Quy trình đầy đủ ở [git-workflow.md](docs/07-development/git-workflow.md).

- Trước khi chỉnh sửa, kiểm tra nhánh hiện tại và `git status`. Đang ở `main` hoặc `dev` thì báo người dùng và đề xuất tách nhánh, không sửa thẳng.
- Không ghi đè, stash, reset hay xóa thay đổi chưa commit của người dùng, kể cả file chưa được theo dõi.
- Không tự ý commit, push, merge, rebase, đổi tên nhánh, gắn tag hay force-push khi chưa được người dùng cho phép. Mỗi lần cho phép chỉ áp dụng cho đúng việc đó.
- Không commit hoặc push trực tiếp vào `main` và `dev`. Mọi thay đổi vào hai nhánh này đi qua pull request.
- Nhánh mới viết tiếng Anh, chữ thường, kebab-case, tách đúng nhánh nguồn trong git-workflow.md. Tiền tố dùng tên đầy đủ hoặc rút gọn đều được: `feature/` hoặc `feat/`, `bugfix/` hoặc `fix/`, `release/`, `hotfix/`, và `type` commit (`chore/`, `docs/`, `ci/`...) cho việc khác.
- Commit theo Conventional Commits với `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `build`, `perf`.
- Không commit secrets, credentials, `.env` có giá trị thật, `target/`, `dist/`, `node_modules/` hay file build. Kiểm tra `git diff --cached` trước khi commit.
- Trước khi đề xuất mở pull request, chạy lint, build và test liên quan, rồi báo kết quả thật.

## Bản đồ điểm vào

| Cần tìm | Bắt đầu ở |
| --- | --- |
| Route và guard | [frontend/src/AnimatedRoutes.jsx](frontend/src/AnimatedRoutes.jsx) |
| Hàm gọi API | [frontend/src/api/index.js](frontend/src/api/index.js), token và refresh ở [axiosClient.js](frontend/src/api/axiosClient.js) |
| Đăng nhập phía client | [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) |
| Ứng dụng backend, cấu hình | [BackendApplication.java](backend/src/main/java/com/ltweb/backend/BackendApplication.java), [application.yaml](backend/src/main/resources/application.yaml) |
| Bảo mật, JWT | `config/SecurityConfig.java`, `config/JwtAuthenticationFilter.java`, `service/JwtService.java` |
| Đặt vé, hủy, hoàn | `service/BookingService.java` → `BookingCheckoutService`, `BookingCommandService`, `BookingQueryService`, `BookingRefundService` |
| VNPay | `service/VnpayService.java`, `service/VnpayRefundGateway.java` |
| Ghế realtime | `config/WebSocketConfig.java`, `BookingTransactionEffects`, `frontend/src/pages/SeatSelect/SeatSelectPage.jsx` |
| Schema | [backend/src/main/resources/db/migration](backend/src/main/resources/db/migration) |

Lần theo một luồng: route trong `AnimatedRoutes.jsx` → component trang → hàm trong `api/index.js` → controller → service. Ví dụ `/my-bookings` → `MyBookingsPage` → `bookingApi.getMyBookings()` → `GET /booking/my-bookings/list` → `BookingController` → `BookingService` → `BookingQueryService.getMyBookingsList()`. Danh sách endpoint và quyền: [endpoints.md](docs/04-api/endpoints.md).

## Đọc thêm theo việc

| Việc | Đọc |
| --- | --- |
| Sửa đặt vé, giữ ghế, check-in | [booking-lifecycle.md](docs/02-domain/booking-lifecycle.md) |
| Sửa thanh toán, hoàn tiền | [payment-refund.md](docs/02-domain/payment-refund.md), [vnpay.md](docs/06-integrations/vnpay.md) |
| Sửa khuyến mãi, hạng thành viên | [promotion-membership.md](docs/02-domain/promotion-membership.md) |
| Sửa schema | [migrations.md](docs/05-database/migrations.md), [data-dictionary.md](docs/05-database/data-dictionary.md) |
| Sửa màn Staff, Manager, Admin | [ops-design-system.md](docs/03-architecture/ops-design-system.md) |
| Quy ước code, Git, kiểm thử | [coding-conventions.md](docs/07-development/coding-conventions.md), [git-workflow.md](docs/07-development/git-workflow.md), [testing.md](docs/07-development/testing.md) |

# Frontend UI & Icon System Rules (`frontend`)

- **Standard Icon Library (`lucide-react`)**: Always use **Lucide Icons** (`lucide-react`) via centralized exports in `frontend/src/components/Common/CinemaIcons.jsx` (or import from `lucide-react` and register in `CinemaIcons.jsx`).
- **NO AI-Generated Inline SVGs**: Never write raw `<svg>` / `<path>` elements inside React pages or components. Only `MoviePTITLogoIcon` in `CinemaIcons.jsx` may use custom brand SVG geometry.
- **NO Emoji Icons in UI**: Never use Unicode emojis (`🎬`, `🍿`, `🎟️`, `💳`, `🔔`, `⏳`, `✅`, `❌`, etc.) as icons for buttons, navigation items, status badges, headers, or action controls. Always use Lucide icon components.
