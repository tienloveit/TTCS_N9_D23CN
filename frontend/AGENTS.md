# Hướng dẫn AI cho frontend

> Đối chiếu mã nguồn ngày 2026-11-25, commit `c9504d3`.

Áp dụng cho `frontend/`. Đọc [quy tắc toàn dự án](../AGENTS.md) trước. Kiến trúc frontend nằm trong [docs/03-architecture/frontend.md](../docs/03-architecture/frontend.md), quy ước code trong [coding-conventions.md](../docs/07-development/coding-conventions.md#frontend).

React 19, Vite 8, React Router 7, JavaScript (không TypeScript), CSS thuần. Dev server `http://localhost:5173`, gọi trực tiếp backend qua `VITE_API_BASE_URL` (mặc định `http://localhost:8081/api`, không có proxy Vite).

## Lệnh

Chạy trong `frontend/`:

```powershell
npm ci
npm run dev
npm run lint                                         # ESLint, lint:tokens và lint:ops
npm run lint:ops                                     # luật khu vận hành (JSX và CSS)
npm run lint:tokens -- --update                      # hạ baseline sau khi thay hex bằng token
npm run build                                        # tạo dist/, không commit
node --experimental-vm-modules --test tests/*.test.mjs
```

`package.json` chưa có script `test`. Test về giờ rạp nên chạy thêm với `TZ=UTC`.

## Quy tắc bắt buộc

- Icon chỉ dùng Lucide qua [CinemaIcons.jsx](src/components/Common/CinemaIcons.jsx), thêm export ở đó khi cần icon mới. Không viết `<svg>`/`<path>` trong trang hay component, trừ `MoviePTITLogoIcon`. Không dùng emoji làm icon.
- Không thêm mã màu hex ngoài `src/styles/tokens.css`. Dùng `var(--...)`, kể cả trong `style={{}}`.
- Màn vận hành (/staff, /manager, /admin) tuân theo [ops-design-system.md](../docs/03-architecture/ops-design-system.md). Tài liệu này thắng mọi skill thiết kế chung. Sau khi sửa phải chạy npm run lint:ops. Không nới luật để qua lint. Claude Code tự nạp luật qua `.claude/rules/ops-design-system.md`, skill `ops-ui` và hook `ops-guard.mjs`. Công cụ AI khác phải tự đọc tài liệu và chạy `npm run lint:ops`.
- Trang khách tiếp tục dùng `Button`, `Badge`, `ConfirmDialog` và các thành phần dùng chung. Giữ thao tác bằng bàn phím, focus, nhãn truy cập và trạng thái tải, lỗi, rỗng.
- Gọi API qua wrapper trong [src/api/index.js](src/api/index.js) và Axios client dùng chung. Giữ hợp đồng `data.result`, `skipAuth`, logic refresh và tải blob.
- Đối chiếu route guard và phạm vi role, chi nhánh. Sửa màn hình dùng chung thì kiểm tra cả biến thể ADMIN, MANAGER và STAFF. Backend quyết định quyền, giá, hạn giữ ghế và điều kiện hoàn tiền.
- Thời gian dùng `src/utils/cinemaTime.js`. Chỉ báo hoàn tiền thành công khi API trả `REFUNDED`. Dùng `expiresAt` và `refundDeadline` của backend, không tự tính.
- Sửa `src/`, không sửa bundle trong `dist/`. Thêm state mới ở cuối component có test dùng `componentHarness.mjs` (giả lập `useState` theo thứ tự).

## Bản đồ điểm vào

| Chủ đề | File |
| --- | --- |
| Khởi động | `src/main.jsx` (nạp `tokens.css` → `index.css` → `components.css`), `src/App.jsx` |
| Route, guard | `src/AnimatedRoutes.jsx`, `src/context/roleHomePaths.js` |
| Đăng nhập | `src/context/AuthContext.jsx`, `useAuth.js` |
| API | `src/api/index.js`, `src/api/axiosClient.js` |
| Trang khách | `src/pages/Home`, `MovieList`, `MovieDetail`, `Schedule`, `SeatSelect`, `Payment`, `MyBookings`, `Profile`, `Login` |
| Khu nhân viên | `src/pages/Staff/` (`booking/StaffBookingPage.jsx`, `checkin/CheckInPage.jsx`, `StaffDashboardPage.jsx`) |
| Khu quản trị, quản lý | `src/pages/Admin/` (dùng chung cho `/admin` và `/manager`) |
| Design system khu vận hành | `src/components/Ops/` (`OpsShell.jsx`, `opsNav.js`, `ops.css`) |
| Luật design system vận hành | `docs/03-architecture/ops-design-system.md`, `scripts/ops-rules.mjs` |
| Tiện ích | `src/utils/cinemaTime.js`, `cinemaFormats.js`, `bookingLimits.js` |
| Test | `tests/*.test.mjs`, `tests/componentHarness.mjs` |

`.agents/skills/` chỉ giữ hai skill AI cho giao diện web: `ui-ux-pro-max` và `design-system`, chỉ dùng cho trang khách.
