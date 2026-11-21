# ADR-0005: Flyway quản lý schema, Hibernate chỉ kiểm tra

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-21 (ghi lại quyết định áp dụng ở commit `e8f0323`, 2026-11-20)
- **Liên quan:** `db/migration/V1` tới `V7`, `backend/migrations/`, `application.yaml`; [migrations.md](../05-database/migrations.md)

## Bối cảnh

Trước đây schema thay đổi theo nhiều cách cùng lúc: `ddl-auto: update` của Hibernate, script SQL chạy tay trong `backend/migrations/` theo thứ tự ghi trong tài liệu, và code sửa cột lúc khởi động (`BackendApplication`, `DataSeedService` tự `ALTER` cột `bookings.status`, `users.role`). Mỗi máy thành viên có một schema hơi khác, Hibernate tạo ràng buộc với tên ngẫu nhiên, và không biết một database đang ở phiên bản nào.

## Quyết định

- Flyway là cách duy nhất thay đổi schema. File nằm trong `src/main/resources/db/migration`, chạy tự động khi khởi động.
- `V1__baseline_schema.sql` mô tả toàn bộ schema cho database rỗng, với tên ràng buộc và index trùng `@Table` của entity.
- Database đã có bảng từ trước được đánh mốc V1 (`baseline-on-migrate`), rồi `V2__legacy_catch_up.sql` đưa về đúng V1. V2 kiểm tra trước mỗi thay đổi nên không làm gì trên database tạo từ V1.
- Hibernate chạy `ddl-auto: validate`: backend dừng nếu entity lệch schema.
- Xóa code sửa schema lúc chạy. Script `20261111_*` chỉ còn cho database rất cũ, chạy trước Flyway.
- File đã phát hành không được sửa.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Flyway + `validate` (đã chọn) | Phiên bản schema rõ ràng, giống nhau mọi máy, kiểm tra được | Phải viết SQL cho mọi thay đổi. Phải xử lý database cũ bằng V2. |
| Liquibase | Hỗ trợ rollback, nhiều định dạng | Thêm một công cụ, nhóm đã quen viết SQL |
| `ddl-auto: update` | Không phải viết SQL | Không xóa cột, không đổi kiểu an toàn, tên ràng buộc ngẫu nhiên, không có lịch sử |
| Script chạy tay | Linh hoạt | Dễ quên, dễ chạy sai thứ tự |

## Hệ quả

- Đổi entity luôn đi kèm một file `V{n}__*.sql` mới. Quy trình ở [add-migration.md](../07-development/how-to/add-migration.md).
- Hai nhánh cùng thêm migration có thể trùng số version, phải đổi số trước khi merge.
- Database cũ có dữ liệu vi phạm ràng buộc làm V2 dừng với thông báo, người vận hành phải sửa dữ liệu.
- Test H2 tạo schema từ entity và không chạy Flyway, nên migration chỉ được kiểm tra đầy đủ trên MySQL.
