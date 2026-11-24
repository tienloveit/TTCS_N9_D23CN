## Làm gì

<!-- Tóm tắt thay đổi. Liên kết issue nếu có. -->

## Vì sao

<!-- Vấn đề hoặc nhu cầu dẫn tới thay đổi này. -->

## Cách kiểm tra

<!-- Các bước người review chạy thử luồng bị ảnh hưởng, kèm tài khoản hoặc role cần dùng. -->

## Ảnh chụp

<!-- Bắt buộc nếu đổi giao diện. Xóa mục này nếu không có. -->

## Migration và biến môi trường

<!-- Ghi tên file Flyway mới và biến môi trường mới, hoặc ghi "Không có". -->

## Checklist trước khi merge

Theo mục "Điều kiện merge" trong `docs/07-development/git-workflow.md`. Đánh dấu mục đã làm, ghi "không áp dụng" cho mục không liên quan.

- [ ] `.\mvnw.cmd test` pass trong `backend/` (gồm Spotless).
- [ ] `npm run lint`, `npm run build` và `node --experimental-vm-modules --test tests/*.test.mjs` pass trong `frontend/`.
- [ ] Có migration mới thì đã khởi động thử trên database rỗng và bản sao có dữ liệu.
- [ ] Đổi API thì đã đối chiếu controller, DTO, mapper, client Axios, các màn hình dùng dữ liệu đó và cập nhật `docs/04-api/endpoints.md`.
- [ ] Đổi quyền thì đã thử với từng role và chi nhánh liên quan.
- [ ] Tài liệu trong `docs/` đã cập nhật cùng thay đổi.
- [ ] Không có bí mật trong diff.
