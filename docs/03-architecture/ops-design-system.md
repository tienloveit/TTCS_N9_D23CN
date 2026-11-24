# Design system khu vận hành: "Bảng suất chiếu"

> Đối chiếu mã nguồn ngày 2026-11-25, commit `6e80be9`.

Đây là nguồn duy nhất của luật giao diện cho `/staff`, `/manager` và `/admin`. Code là sự thật: giá trị token nằm trong [tokens.css](../../frontend/src/styles/tokens.css) và [ops.css](../../frontend/src/components/Ops/ops.css), API thành phần nằm trong [components/Ops](../../frontend/src/components/Ops/) và trang `/ops-gallery` (chỉ có khi chạy Vite dev). Tài liệu này giải thích ý nghĩa và luật dùng.

## Phạm vi và thứ tự ưu tiên

- Áp dụng cho mọi màn của `/staff`, `/manager`, `/admin` và các file:
  - JSX: `frontend/src/pages/Admin/**`, `frontend/src/pages/Staff/**`, `frontend/src/components/Ops/**` (`.js`, `.jsx`).
  - CSS: `frontend/src/components/Ops/ops.css`, `frontend/src/styles/ops/**.css`.
- Trong phạm vi này, tài liệu này thắng mọi skill thiết kế chung: `ui-ux-pro-max` và `design-system` trong `frontend/.agents/skills`, plugin `frontend-design`. Các skill đó chỉ dùng cho trang khách.
- Muốn đổi design system thì sửa tài liệu này, code và luật máy kiểm trong cùng một commit (xem [Thay đổi design system](#thay-đổi-design-system)).

## Năm nguyên tắc

1. **Thời gian là trục chính.** Giờ chiếu luôn hiện bằng chữ số co hẹp, cỡ lớn, đều cột, giống bảng suất chiếu ở sảnh rạp. Màn nào có lịch chiếu đều có vạch "bây giờ".
2. **Một khung, ba vai trò.** Cùng một khung trang (`OpsShell`). Menu thay đổi theo vai trò, còn nhãn phạm vi ("Toàn hệ thống" hoặc tên chi nhánh) luôn hiện ở thanh trên.
3. **Mật độ theo trạm.** Có hai chế độ: `touch` cho quầy và cổng soát vé (ô điều khiển 44px), `desk` cho manager và admin (ô điều khiển 36px). Chỉ đổi biến CSS, không viết CSS riêng cho từng chế độ.
4. **Màu chỉ dùng để nói trạng thái.** Nền và chữ dùng các tông xám trung tính. Nút chính màu mực đen. Màu gỉ sắt thương hiệu (`--o-mark`) chỉ dùng cho hai nghĩa "bạn đang ở đây" và "bây giờ". Xanh lá, hổ phách, đỏ, xanh dương chỉ dùng cho trạng thái.
5. **Phân tầng bằng viền, không bằng bóng đổ.** Panel phẳng, có viền mảnh. Bóng đổ chỉ dành cho lớp nổi: hộp thoại, drawer, menu, toast.

## Token

Token chung nằm trong `src/styles/tokens.css`. Biến mật độ (`--o-control-h`, `--o-row-h`, `--o-text`, `--o-table-text`, `--o-h1`, `--o-pad`) đặt trên gốc `.ops` trong `ops.css` và đổi theo `data-density`. Không chép giá trị số vào code, luôn dùng `var(--o-...)`.

### Màu

| Token | Nghĩa |
| --- | --- |
| `--o-canvas` | Nền trang |
| `--o-surface` | Panel, bảng, hộp thoại, sidebar |
| `--o-sunken` | Đầu bảng, dòng đang hover, ô chọn trong nhóm nút, thanh tiến độ rỗng |
| `--o-line` | Đường kẻ trang trí: viền panel, kẻ dòng bảng. Tương phản thấp, không mang nghĩa |
| `--o-control-line` | Viền mang nghĩa: ô nhập, checkbox, nút viền (đạt 3:1) |
| `--o-ink`, `--o-ink-hover` | Chữ chính, nền nút chính và trạng thái hover của nó |
| `--o-ink-2` | Chữ phụ, cột biểu đồ, phần đã bán của thanh lấp đầy |
| `--o-muted` | Chú thích, nhãn trường, đầu cột bảng |
| `--o-mark`, `--o-mark-soft` | **Chỉ** cho "đang ở đây" (mục menu đang chọn, dòng đang chọn), "bây giờ" (vạch giờ hiện tại) và vòng focus |
| `--success`, `--warning`, `--danger`, `--info` và biến thể `-soft`, `-strong` | **Chỉ** cho trạng thái. Luôn đi kèm chữ hoặc icon, không chỉ dựa vào màu |
| `--o-chart-1`, `--o-chart-2`, `--o-chart-grid` | Chuỗi số liệu thứ nhất, thứ hai và lưới ngang của biểu đồ |

### Chữ

- Font duy nhất là Archivo (`--o-font`). Trục độ rộng điều khiển bằng `font-stretch`: chữ giao diện 100%, dữ liệu (tiền, mã, số ghế, ô số) `--o-stretch-data`, giờ chiếu và số liệu lớn `--o-stretch-time`.
- Mọi chỗ hiển thị số có `font-variant-numeric: tabular-nums`.
- Thang cỡ `--o-fs-xs` … `--o-fs-3xl` và `--o-fs-time` cho giờ nổi bật. Độ đậm chỉ có 400 (chữ thường), 600 (nhãn, nút, tiêu đề), 700 (số liệu lớn).
- Không viết hoa toàn bộ, không giãn chữ cho nhãn.

### Khoảng cách và mật độ

- Bước khoảng cách 4px, dùng `--space-1` … `--space-8`. Đệm panel `--o-pad`.
- Bảng và lịch kéo hết chiều ngang. Form tối đa 720px. Mọi thứ căn trái, cột số và tiền căn phải.
- `OpsShell` đặt `data-density="touch"` cho `/staff`, `desk` cho `/admin` và `/manager`. Màn bán vé và soát vé luôn dùng `touch`.

### Bo góc, độ nổi, chuyển động

- `--o-r-1` cho badge, ô nhập, khối suất chiếu. `--o-r-2` cho nút, nhóm nút, tab. `--o-r-3` cho panel, hộp thoại, toast. Cạnh drawer dính mép màn hình và bảng trong panel bo 0.
- Lớp nổi dùng `--o-shadow-float` và nền che `--o-scrim`. Panel không có bóng.
- `--o-dur-1` cho hover và nhấn, `--o-dur-2` cho mở lớp nổi và đổi kết luận soát vé, easing `--o-ease-out`. Chỉ có chuyển động khi người dùng thao tác. Route vận hành không bọc `PageWrapper`. `prefers-reduced-motion: reduce` đưa thời lượng về 0.

## Kiến trúc CSS

1. **Gốc `.ops`.** `OpsShell` render `<div className="ops" data-density="...">`. Mọi style vận hành nằm dưới gốc này.
2. **Reset trong gốc.** `ops.css` đặt lại font, màu chữ, link, focus và margin trong `.ops`, nên không phụ thuộc quy tắc toàn cục của `index.css`.
3. **Chỉ dùng class tiền tố `o-`**, đặt tên theo BEM rút gọn: `o-table`, `o-table__cell`, `o-btn--primary`. Trạng thái dùng ARIA hoặc `data-*` (`[aria-current="page"]`, `[aria-pressed="true"]`, `[data-state="open"]`), không dùng class `is-*`.
4. **Độ ưu tiên phẳng.** Mỗi selector tối đa một class cộng một thuộc tính hoặc pseudo-class. Không lồng sâu, không dùng `!important`.
5. **Cấm class cũ:** `btn`, `btn-*`, `input`, `card`, `page`, `page-title`, `container`, `form-group`, `form-label`, `modal-content`, `modal-overlay`, `loading`, `spinner` và các tiền tố `admin-`, `staff-`, `counter-`, `gate-`, `dashboard-`, `booking-`, `schedule-`, `revenue-`, `ops-`, `analytics-`, `stat-`.
6. **Inline style** chỉ truyền giá trị động qua biến CSS, ví dụ `style={{ '--o-start': 0.42, '--o-span': 0.08 }}`.
7. **Không dùng `@layer`.** `index.css` không nằm trong layer nào, nên style trong layer luôn thua.

Nơi đặt CSS mới: tạo file trong `src/styles/ops/` và `@import` nó ở đầu `src/components/Ops/ops.css`, cạnh các import hiện có. `ops.css` chỉ được import trong `OpsShell.jsx` (và `OpsGallery.jsx` ở chế độ dev). Không import CSS trong trang.

## Thành phần

Mọi thành phần export qua `components/Ops/index.js`, nhận `className` và chuyển tiếp prop còn lại xuống phần tử gốc. API chi tiết xem code và `/ops-gallery`.

| Cần gì | Dùng gì |
| --- | --- |
| Khung trang có sidebar, thanh trên, menu theo vai trò | `OpsShell` (qua `AdminLayout`, `StaffLayout`), menu khai báo trong `opsNav.js` |
| Tiêu đề trang `h1`, mô tả, hành động, `document.title` | `OpsPage`. Mỗi trang đúng một `h1` |
| Khối nội dung có tiêu đề `h2` | `OpsPanel`. Có bảng bên trong thì dùng `flush`. Không lồng panel |
| Nút | `OpsButton` (`primary`, `secondary`, `ghost`, `danger`, `ghost-danger`; `icon`, `to`, `loading`). Mỗi vùng tối đa một nút `primary` |
| Dải số liệu tổng hợp | `StatStrip`. Không icon, không gradient, không bóng |
| Bảng dữ liệu kèm trạng thái tải, lỗi, rỗng | `DataTable` trong `OpsPanel flush` (`state`, `error`, `onRetry`, `empty`, `onRowOpen`, `sort`, `stackOnMobile`) |
| Phân trang phía server | `Pagination` |
| Tìm kiếm và lọc | `FilterBar` (debounce `SEARCH_DEBOUNCE_MS` trong `utils/opsFilters.js`) |
| Chọn một giá trị để lọc trên cùng màn | `Segmented` (`aria-pressed`) |
| Đổi khối nội dung | `Tabs` (mẫu ARIA tablist) |
| Nhãn trạng thái | `StatusBadge` với `kind` = `booking`, `payment`, `showtime`, lấy nhãn và tone từ `utils/bookingStatus.js`, `paymentStatus.js`, `showtimeStatus.js`. Không khai báo lại nhãn trong trang |
| Form | `Field` bọc `TextInput`, `Select`, `Textarea`, `Checkbox`, `Switch`, `ChoiceCards` |
| Hộp thoại | `OpsDialog` (`sm`, `md`, `lg`) |
| Xem chi tiết rồi thao tác | `OpsDrawer` |
| Xác nhận thao tác, nói rõ hậu quả | `OpsConfirm` (`tone="danger"` cho thao tác phá huỷ) |
| Trạng thái rỗng, lỗi, đang tải ngoài bảng | `StateBlock` |
| Lịch chiếu theo phòng và giờ, vạch "bây giờ" | `ShowtimeRail` |
| Trình tự bước bán vé tại quầy | `Stepper` (chỉ dùng cho quầy) |
| Kết luận soát vé | `Verdict` |
| Tiền, mã, giờ chiếu, ngày | `Money`, `Code`, `ShowTime`, `DateLabel` |
| Cấu hình biểu đồ recharts theo token | `getChartTheme` |

Thiếu thành phần thì thêm vào `components/Ops` (kèm mục trong `/ops-gallery`), không tự dựng trong trang.

## Chữ trên giao diện

- Viết hoa chữ đầu câu, tiếng Việt đầy đủ dấu. Không viết hoa toàn bộ, không dùng dấu chấm than.
- Nút ghi đúng việc sẽ xảy ra và giữ cùng động từ xuyên suốt luồng. Ví dụ nút "Duyệt hoàn tiền", toast "Đã duyệt hoàn tiền đơn MPT-1182". Nút sửa ghi "Lưu thay đổi", nút tạo ghi "Thêm <đối tượng>".
- Toast thành công theo mẫu `Đã <động từ> <đối tượng>`.
- Lỗi nói chuyện gì xảy ra và cách xử lý, không xin lỗi, không mơ hồ. Ví dụ "Không tải được danh sách đơn. Kiểm tra kết nối rồi bấm Thử lại."
- Trạng thái rỗng là lời mời hành động. Ví dụ "Chưa có suất chiếu nào ngày 25/11." kèm nút "Thêm suất chiếu".
- Số và ngày: tiền "1.245.000 đ", giờ "14:05" (24 giờ, giờ rạp), ngày "T3, 24/11" hoặc "24/11/2026" khi cần năm.
- Không nối thông tin bằng `·`, không dùng mũi tên `→` trong chữ trên giao diện.

## Luật được máy kiểm

Luật nằm trong [ops-rules.mjs](../../frontend/scripts/ops-rules.mjs), test ở `frontend/tests/opsRules.test.mjs`. Không tắt được bằng comment `eslint-disable`.

| Áp cho | Luật | Thông báo |
| --- | --- | --- |
| JSX | Class cũ | `Class cũ: <tên>` |
| JSX | `style` là object literal có key không bắt đầu bằng `--` | `Inline style chỉ truyền biến CSS: <key>` |
| JSX | `style` không phải object literal, `?:`/`&&` của object literal hay `undefined` | `Inline style phải là object literal chỉ chứa biến CSS` |
| JSX | Phần tử `<svg>` hoặc `<path>` | `Không viết <svg>/<path>, dùng icon trong CinemaIcons.jsx` |
| JSX | Emoji trong chữ, chuỗi hoặc template | `Không dùng emoji trong giao diện` |
| JSX | `!`, `·`, `→` trong chữ JSX, chuỗi làm giá trị thuộc tính JSX, tham số đầu của `toast.*()` | `Chữ giao diện không dùng "!", "·" hoặc "→"` |
| JSX | Import `components/Common/` `Button`, `Badge`, `ConfirmDialog`, `EmptyState`, `Skeleton` | `Khu vận hành dùng components/Ops thay cho <Tên>` |
| JSX | Import file `.css`, trừ `OpsShell.jsx` và `OpsGallery.jsx` | `Không import CSS trong trang, thêm @import vào components/Ops/ops.css` |
| JSX, CSS | Mã màu hex | `Mã màu hex trong khu vận hành, dùng var(--...)` |
| JSX | Lỗi cú pháp | `Không đọc được file: <lỗi>` |
| CSS | `!important` | `Không dùng !important` |
| CSS | `@layer` | `Không dùng @layer` |
| CSS | Class không có tiền tố `o-` (ngoại lệ: `ops`, `seat`, `seat--*`, `seat-legend-dot`, `digital-ticket`, `Toastify__toast*`) | `Class ngoài tiền tố o-: <tên>` |
| CSS | `box-shadow` khác `var(--o-shadow-*)`, `inset ...` hoặc `none` | `box-shadow chỉ dùng var(--o-shadow-*), inset hoặc none` |
| CSS | `font-family` khác `var(--o-font...)` hoặc `inherit` | `font-family chỉ dùng var(--o-font) hoặc inherit` |

Ba nơi chạy luật:

1. `npm run lint:ops` trong `frontend/` (đã nằm trong `npm run lint`).
2. Hook `PostToolUse` của Claude Code gọi `frontend/scripts/ops-guard.mjs` sau mỗi lần sửa file. Vi phạm được trả lại cho Claude để sửa ngay.
3. CI GitHub Actions `frontend` chạy `npm run lint` trên mọi pull request.

Gặp lỗi thì sửa code theo thông báo. Không nới luật để qua lint. Nếu một trường hợp thật sự hợp lệ, hỏi người duyệt và sửa luật theo mục cuối.

## Checklist review

Các luật máy không kiểm được. Người review và AI phải đi qua từng mục:

- [ ] `--o-mark` chỉ dùng cho "đang ở đây", "bây giờ" và focus. Màu trạng thái chỉ dùng cho trạng thái và luôn có chữ hoặc icon đi kèm.
- [ ] Bóng đổ chỉ có ở lớp nổi (hộp thoại, drawer, menu, toast). Panel phân tầng bằng viền.
- [ ] Mật độ chỉ đổi bằng biến CSS, không có CSS riêng cho `touch` hay `desk`.
- [ ] Trạng thái dùng ARIA hoặc `data-*`, không dùng class `is-*`.
- [ ] Selector tối đa một class cộng một thuộc tính hoặc pseudo-class.
- [ ] Giờ dùng `ShowTime`, tiền dùng `Money`, mã dùng `Code`, ngày dùng `DateLabel` hoặc `cinemaTime.js`.
- [ ] Số liệu tổng hợp dùng `StatStrip`, không làm thẻ KPI có icon.
- [ ] Nhãn trạng thái lấy từ bảng ánh xạ dùng chung qua `StatusBadge`.
- [ ] Có đủ trạng thái tải, lỗi, rỗng. Lỗi có cách xử lý, rỗng có hành động.
- [ ] Thao tác được bằng bàn phím, focus thấy rõ, nút chỉ có icon có `aria-label`, mỗi trang một `h1`.
- [ ] Chữ theo mục [Chữ trên giao diện](#chữ-trên-giao-diện), cùng động từ giữa nút và toast.
- [ ] Đã xem ở cả `touch` và `desk` trong `/ops-gallery` hoặc trên màn thật, và ở các điểm chia 1280px, 1024px, 768px.
- [ ] Màn dùng chung đã thử với ADMIN, MANAGER và STAFF.

## Thay đổi design system

Thêm token, thành phần hoặc ngoại lệ thì sửa trong cùng một commit:

1. Tài liệu này.
2. Code: `tokens.css`, `ops.css`, `components/Ops/*` và mục tương ứng trong `/ops-gallery`.
3. `frontend/scripts/ops-rules.mjs` và `frontend/tests/opsRules.test.mjs` nếu thay đổi thuộc luật máy kiểm.
