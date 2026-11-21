# Quy ước viết code

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

## Chung

- Giữ thay đổi trong phạm vi việc đang làm. Không định dạng lại hay đổi tên hàng loạt trong cùng commit với thay đổi nghiệp vụ.
- Backend quyết định quyền, giá, hạn giữ ghế, tồn bắp nước và thời hạn hoàn. Frontend chỉ hiển thị, hoặc ước tính trong lúc chờ dữ liệu từ backend.
- Không đưa giá trị bí mật vào code, test hay tài liệu. Dùng tên biến trong `.env.example`.
- Chú thích bằng tiếng Việt hoặc tiếng Anh đều được, ưu tiên giải thích lý do thay vì mô tả lại code.
- Đổi hành vi nghiệp vụ, API hay schema thì cập nhật file tương ứng trong `docs/` cùng commit. Xem [docs/README.md](../README.md).

## Backend

### Cấu trúc và đặt tên

Package chia theo tầng (`controller`, `service`, `repository`, `entity`, `dto`, `mapper`...), không chia theo tính năng. Trách nhiệm từng tầng ở [backend.md](../03-architecture/backend.md#package).

| Loại | Quy ước | Ví dụ |
| --- | --- | --- |
| Class | PascalCase, hậu tố theo tầng | `ShowtimeController`, `ShowtimeService`, `ShowtimeRepository`, `ShowtimeMapper` |
| DTO request | `Create<Tên>Request`, `Update<Tên>Request`, hoặc theo hành động | `CreateBookingRequest`, `CheckInTicketRequest` |
| DTO response | `<Tên>Response` | `BookingResponse` |
| Enum | PascalCase cho kiểu, `UPPER_SNAKE` cho giá trị | `BookingStatus.REFUND_REQUESTED` |
| Mã lỗi | `ErrorCode.UPPER_SNAKE` | `CHECKIN_TOO_EARLY` |
| Hằng số nghiệp vụ | `static final`, tên nói rõ đơn vị | `STAFF_SALE_GRACE_MINUTES` |
| Bảng, cột | `snake_case`, bảng số nhiều | `booking_foods.unit_price` |

Endpoint:

- Theo nhóm của controller đang có. Dự án hiện trộn số ít (`/movie`, `/booking`, `/showtime`) và số nhiều (`/users`, `/notifications`). Endpoint mới đi theo tiền tố của controller chứa nó, không đổi tiền tố cũ.
- Từ ghép dùng kebab-case: `/my-bookings`, `/refund-request`, `/apply-promotion`.
- API quản trị và báo cáo đặt dưới `/admin/...`. Tích hợp ngoài đặt dưới `/v1/...`.
- Thao tác không phải CRUD là một đường dẫn động từ con: `POST /booking/{id}/refund-request`, `POST /ticket/check-in`.

### Khi nào tạo DTO mới

- Luôn trả DTO, không trả entity. Entity có quan hệ lazy và `open-in-view` đã tắt, trả entity gây lỗi khi serialize.
- Tạo request DTO khi body có từ hai trường trở lên hoặc cần validate. Body một trường có thể nhận `Map<String, String>` như các route hoàn tiền cũ, nhưng nên dùng DTO cho route mới.
- Thêm trường vào response hiện có khi frontend cần thêm dữ liệu của cùng đối tượng. Tạo response mới khi màn hình cần một hình dạng khác hẳn (ví dụ `StaffDashboardResponse`).
- Map bằng MapStruct trong `mapper/`. Trường phẳng hóa từ quan hệ (`BookingResponse.paymentStatus` lấy từ `payment.paymentStatus`) khai báo bằng `@Mapping`.
- Validate bằng Jakarta Validation (`@NotBlank`, `@Valid`) và thêm `@Valid` ở tham số controller.

### Nghiệp vụ

- Inject bằng constructor (`@RequiredArgsConstructor` của Lombok).
- `@PreAuthorize` cho role, kiểm tra chủ sở hữu và chi nhánh trong service bằng `CurrentUserProvider`, `BookingAccessPolicy`, `RefundPolicy`.
- Ném `AppException(ErrorCode.X)`. Mã lỗi mới chọn đúng HTTP status, thông báo cho người dùng viết tiếng Việt.
- Thời gian: `LocalDateTime.now(clock)` với `Clock` được inject. Không gọi `LocalDateTime.now()` trong nghiệp vụ.
- Tác động ngoài (STOMP, Redis, email) chạy sau commit. Xem [backend.md](../03-architecture/backend.md#transaction).
- Đổi giữ ghế, thanh toán, hoàn tiền hoặc tồn kho thì kiểm tra khóa DB, chủ sở hữu khóa Redis, rollback, retry và xử lý sau commit. Tái sử dụng `BookingTransactionEffects` và `BookingReleaseService`.
- Tiền dùng `BigDecimal`, không dùng `double`.

### Định dạng

Spotless với Google Java Format 1.25.2 chạy ở phase `validate`, nên `mvnw compile`, `test`, `package` đều dừng nếu code sai định dạng. `ratchetFrom` là commit `bf27d26c04b17780279ead08e392de319651e475`: chỉ file thay đổi từ commit này bị kiểm tra.

```powershell
.\mvnw.cmd spotless:apply   # sửa định dạng
.\mvnw.cmd spotless:check   # chỉ kiểm tra
```

Không sửa mã MapStruct sinh trong `target/`.

## Frontend

### Cấu trúc và đặt tên

| Loại | Quy ước | Ví dụ |
| --- | --- | --- |
| Component, trang | PascalCase `.jsx`, một component chính mỗi file | `BookingCard.jsx`, `StaffSeatStep.jsx` |
| Hook | `useTên.js` | `useModalDialog.js`, `useActiveBranches.js` |
| Hàm thuần, hằng | camelCase `.js` | `cinemaTime.js`, `staffBookingUtils.js` |
| CSS của trang | Cùng tên với trang hoặc khu, import trong trang | `MyBookingsPage.css`, `StaffBooking.css` |
| Thư mục trang | `src/pages/<Khu>/`, khu nhỏ tách thư mục con | `pages/Staff/booking/`, `pages/Staff/checkin/` |

Trang lớn giữ state, effect và gọi API ở component cha. Component con chỉ nhận props, hàm thuần tách ra file `*Utils.js` để test được. `StaffBookingPage` và `CheckInPage` là mẫu.

### Gọi API

- Chỉ gọi qua wrapper trong [src/api/index.js](../../frontend/src/api/index.js). Thêm hàm vào nhóm tương ứng thay vì gọi `axiosClient` trong trang.
- Đọc dữ liệu ở `response.data.result`. Tải file dùng `responseType: 'blob'`.
- Request không được gắn token dùng `skipAuth: true`.
- Khi nhiều lần gọi có thể chồng nhau (ô tìm kiếm, tự làm mới), chỉ nhận phản hồi của lần gọi mới nhất.

### Icon

- Chỉ dùng **Lucide** (`lucide-react`) qua export tập trung trong [CinemaIcons.jsx](../../frontend/src/components/Common/CinemaIcons.jsx). Cần icon mới thì thêm export ở đó.
- Không viết `<svg>` hay `<path>` trong trang hoặc component. Ngoại lệ duy nhất là `MoviePTITLogoIcon` trong `CinemaIcons.jsx`.
- Không dùng emoji (🎬, 🍿, ✅...) làm icon cho nút, menu, badge, tiêu đề hay điều khiển.

### Màu và CSS

- Không thêm mã màu hex ngoài `src/styles/tokens.css`. Dùng `var(--...)`, kể cả trong `style={{}}`.
- `npm run lint` chạy `lint:tokens`, lệnh này thất bại khi một file có nhiều mã hex hơn mức trong `design-tokens-baseline.json`. Sau khi thay mã hex bằng token, chạy `npm run lint:tokens -- --update` để hạ mức. Mức chỉ được giảm.
- Khu `/admin`, `/manager` dùng `--ops` làm màu nhấn, khu nhân viên dùng nhóm `--staff-*`.
- CSS gộp chung toàn ứng dụng. Class dùng chung với trang khác phải viết kèm class cha của khu đang sửa.
- Không dùng Tailwind hay PostCSS.

### Component và trải nghiệm

- Tái sử dụng `Button`, `Badge`, `ConfirmDialog`, `EmptyState`, `Skeleton`, `useModalDialog` và bộ class `admin-*` trong `Admin.css`. Danh sách ở [frontend.md](../03-architecture/frontend.md#thành-phần-dùng-chung).
- Mọi màn hình có trạng thái đang tải, lỗi và rỗng.
- Thao tác được bằng bàn phím, focus nhìn thấy được, nút chỉ có icon có `aria-label`, nhóm nút chọn một dùng `aria-pressed`.
- Thời gian dùng `src/utils/cinemaTime.js`. Không tự tính "hôm nay" bằng `new Date()`.
- Màn hình dùng chung (`BookingManagement`, `NotificationPage`, các trang Admin) phải kiểm tra cả biến thể ADMIN, MANAGER và STAFF.
- Test của `BookingManagement` giả lập `useState` theo thứ tự khai báo, nên thêm state mới ở cuối component.

### Lint

ESLint 9 (`eslint.config.js`): `@eslint/js` recommended, `react-hooks`, `react-refresh` cho Vite. `no-unused-vars` bỏ qua tên bắt đầu bằng chữ hoa hoặc `_`. `CinemaIcons.jsx` có ngoại lệ cho HOC `withLucideDefaults`. Chưa có Prettier, giữ định dạng giống file đang sửa.

```powershell
npm run lint
```

## Tài liệu

- Đầu mỗi file trong `docs/` ghi `> Đối chiếu mã nguồn ngày <YYYY-MM-DD>, commit <hash>.` Cập nhật dòng này khi đối chiếu lại.
- Mỗi chủ đề có một file nguồn. Nơi khác chỉ link tới file đó.
- Sơ đồ viết bằng Mermaid. File `.mmd` trong `docs/03-architecture/diagrams/` để xuất ảnh, xem [diagrams/README.md](../03-architecture/diagrams/README.md).
