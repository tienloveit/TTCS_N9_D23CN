# Hướng dẫn AI cho frontend

Áp dụng cho `frontend/`. Đọc [quy tắc toàn dự án](../AGENTS.md) và [context frontend](CLAUDE.md) trước khi sửa. Khi sửa API, đối chiếu [context backend](../backend/CLAUDE.md) và DTO/controller tương ứng.

- Dùng icon Lucide qua [CinemaIcons.jsx](src/components/Common/CinemaIcons.jsx). Thêm export tại đây khi cần icon mới. `MoviePTITLogoIcon` là ngoại lệ duy nhất được dùng SVG thương hiệu tùy chỉnh. Tránh SVG/path viết tay và emoji làm icon UI.
- Tái sử dụng component trong `src/components/`, token trong `src/styles/tokens.css`, CSS chung trong `src/index.css` và style của khu vực đang sửa. Không thêm mã màu hex ngoài `tokens.css`; dùng `var(--...)`, kể cả trong `style={{}}`. Giữ thao tác bằng bàn phím, focus, nhãn truy cập và trạng thái tải/lỗi/rỗng của màn hình.
- Dùng API wrapper trong [src/api/index.js](src/api/index.js) và Axios client dùng chung. Giữ hợp đồng `data.result`, `skipAuth`, logic refresh và tải blob theo loại request.
- Đối chiếu route guard và phạm vi role/chi nhánh. Khi sửa màn hình dùng chung, kiểm tra các biến thể ADMIN, MANAGER và STAFF đang dùng component đó. Backend quyết định quyền, giá, hạn giữ ghế và điều kiện hoàn tiền.
- Giữ đúng ý nghĩa của các mốc thời gian và trạng thái đặt vé. Dùng tiện ích dùng chung khi màn hình đã dùng thời gian rạp. Báo hoàn tiền thành công khi API xác nhận `REFUNDED`.
- Sửa `src/` thay vì bundle sinh ra trong `dist/`. Chạy `npm run lint`, `npm run build` và `node --experimental-vm-modules --test tests/*.test.mjs` trong `frontend/` theo phạm vi thay đổi.
