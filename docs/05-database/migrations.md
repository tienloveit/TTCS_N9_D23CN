# Migration

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Schema do Flyway quản lý ([ADR-0005](../08-decisions/0005-flyway-owns-schema.md)). Các bước thêm một migration mới nằm trong [add-migration.md](../07-development/how-to/add-migration.md). File này mô tả quy tắc và lịch sử.

## Quy tắc

- Migration nằm trong [backend/src/main/resources/db/migration](../../backend/src/main/resources/db/migration) và chạy tự động khi backend khởi động, trước khi Hibernate kiểm tra entity (`ddl-auto: validate`).
- Tên file: `V{n}__mo_ta_bang_chu_thuong.sql`, `n` tăng dần liên tục, hai dấu gạch dưới. Ví dụ `V8__food_categories.sql`.
- **Không sửa file đã phát hành.** Flyway lưu checksum từng file trong `flyway_schema_history`. Sửa file đã chạy làm backend dừng với `checksum mismatch` trên mọi máy đã chạy file đó. Mọi thay đổi đi vào một file mới.
- Không sửa schema bằng code lúc chạy, không bật `ddl-auto: update`, không sửa bảng bằng tay trên database dùng chung.
- Đặt tên ràng buộc và index giống trong `@Table` của entity: `uk_<bảng>_<cột>`, `idx_<bảng>_<cột>`, `chk_<bảng>_<ý nghĩa>`, `fk_<bảng>_<đích>`.
- Thêm giá trị enum trong Java thì thêm migration cập nhật cột `ENUM` hoặc `CHECK` tương ứng (V3, V7 là ví dụ).
- Kết nối MySQL đặt `time_zone = '+07:00'`, nên `CURRENT_TIMESTAMP` trong migration là giờ rạp.
- Migration phải chạy được trên cả database rỗng lẫn database đã có dữ liệu. Khi siết ràng buộc, kiểm tra dữ liệu trước và dừng bằng `SIGNAL SQLSTATE '45000'` với thông báo rõ ràng, thay vì để lỗi khóa ngoại khó hiểu.

## Các version đã phát hành

| Version | Nội dung |
| --- | --- |
| [V1__baseline_schema](../../backend/src/main/resources/db/migration/V1__baseline_schema.sql) | Toàn bộ schema cho database rỗng: bảng, index, CHECK, khóa ngoại. |
| [V2__legacy_catch_up](../../backend/src/main/resources/db/migration/V2__legacy_catch_up.sql) | Đưa database có từ trước Flyway về đúng V1. Gộp các script chạy tay trước đây: marker lần hoàn VNPay trong `payments`; cờ `promotion_usage_reserved`, `spending_recorded`; `users.role` thành VARCHAR với `chk_users_role`; bảng và cột còn thiếu; index; NOT NULL; CHECK; khóa ngoại `branch_id` của `users`, `foods`, `promotions`. Mỗi bước kiểm tra trước khi đổi, nên trên database tạo từ V1 file này không thay đổi gì. |
| [V3__money_precision_and_enum_checks](../../backend/src/main/resources/db/migration/V3__money_precision_and_enum_checks.sql) | Mọi cột tiền thành `DECIMAL(15,2)`. `refund_gateway_status` thống nhất `VARCHAR(20)`. Thêm CHECK cho `payment_status`, `refund_gateway_status`. |
| [V4__notification_reads](../../backend/src/main/resources/db/migration/V4__notification_reads.sql) | Bảng `notification_reads`. Chép trạng thái đã đọc cũ cho mọi người nhận hợp lệ, rồi bỏ `notifications.read_at`. |
| [V5__payment_events](../../backend/src/main/resources/db/migration/V5__payment_events.sql) | Bảng nhật ký `payment_events`. |
| [V6__room_seat_capacity](../../backend/src/main/resources/db/migration/V6__room_seat_capacity.sql) | Tính lại `seat_capacity` bằng số ghế thật, thêm CHECK không âm. |
| [V7__audit_refund_requested](../../backend/src/main/resources/db/migration/V7__audit_refund_requested.sql) | Thêm `REFUND_REQUESTED` vào ENUM `audit_logs.action`. |

## Database rỗng

Tạo schema `cinema` (utf8mb4) rồi khởi động backend. Flyway chạy V1 tới V7.

## Database có từ trước

Với database đã có bảng nhưng chưa có `flyway_schema_history`, cấu hình `baseline-on-migrate: true` và `baseline-version: 1` làm Flyway ghi mốc V1 mà không chạy V1, rồi chạy V2 trở đi.

Điều kiện: database phải ở trạng thái sau các script `20261111_*` (khóa chính `id`, bảng `payments` tách riêng...). Nếu chưa, chạy các script đó trước theo [bảng dưới](#script-chạy-tay-cho-database-rất-cũ).

Trước lần đầu khởi động phiên bản có Flyway, sao lưu database.

V2 kiểm tra dữ liệu trước khi siết ràng buộc và dừng với thông báo cụ thể nếu gặp NULL bắt buộc, tên thể loại hoặc mã QR trùng, chi nhánh mồ côi, giá trị âm hoặc ngoài khoảng. V2 chỉ tự chuẩn hóa các NULL có một nghĩa duy nhất:

| Cột | NULL thành |
| --- | --- |
| `promotions.used_count` | `0` |
| `foods.active`, `promotions.active` | `0` (ứng dụng vốn coi NULL là không hoạt động) |
| `users.status` | `ACTIVE` |
| `users.role` | `USER` |
| `bookings.discount_amount` | `0` |

Marker lần hoàn trong V2 không sửa lịch sử. Đơn `REFUNDED` từ phiên bản cũ có marker null không phải bằng chứng VNPay đã hoàn, cần đối soát riêng, không gửi lại hàng loạt.

Sau V2, xóa chi nhánh còn nhân viên, món hoặc khuyến mãi bị khóa ngoại chặn, và tạo thể loại trùng tên trả lỗi ràng buộc.

## Khi migration dừng giữa chừng

MySQL không rollback DDL, nên một migration lỗi có thể đã chạy một phần. Mọi bước của V2 và V3 kiểm tra trước khi đổi nên chạy lại được.

1. Đọc thông báo lỗi trong log, sửa dữ liệu theo thông báo.
2. Xóa dòng ghi nhận lỗi:

   ```sql
   DELETE FROM flyway_schema_history WHERE success = 0;
   ```

3. Khởi động lại backend.

## Script chạy tay cho database rất cũ

[backend/migrations/](../../backend/migrations) chỉ còn các script `20261111_*` cho database có trước đợt chuyển khóa chính sang `id` và tách bảng `payments` (còn khóa chính `branch_id`, `movie_id`, `booking_id`). Chạy khi backend đang dừng, sau khi sao lưu, **theo thứ tự phụ thuộc dưới đây, không chạy cả thư mục theo thứ tự tên file**. Sau đó mới khởi động backend để Flyway baseline và chạy V2.

| Thứ tự | Thay đổi | Script và điều kiện |
| --- | --- | --- |
| 1 | Đổi khóa chính sang `id` | `20261111_primary_keys_to_id.sql`. Giữ giá trị, AUTO_INCREMENT, cập nhật khóa ngoại. Chạy trước các script tham chiếu cột `id`. |
| 2 | Chi nhánh, phòng, ghế | `20261111_branch_room_constraints.sql`, `20261111_seat_constraints.sql`. Mã phòng tối đa 50 ký tự. Ghế cần mã và vị trí hợp lệ, không trùng trong phòng. |
| 3 | Công nghệ phòng, định dạng chiếu | `20261111_screening_format_room_technology.sql`. Phòng 2D/3D cũ thành `STANDARD`, định dạng 3D chuyển sang suất chiếu. Kiểm tra lại định dạng của suất IMAX/4DX cũ. |
| 4 | Thời gian, trạng thái, giá suất | `20261111_showtime_time_constraints.sql`, `20261111_showtime_status_not_null.sql`, `20261111_showtime_ticket_price.sql`. Sửa suất thiếu giờ, giờ kết thúc sai hoặc trạng thái NULL trước. |
| 5 | Metadata và hiển thị phim | `20261111_movie_editor.sql` thêm metadata và cột `published`. Sau đó `20261111_movie_is_public.sql` nếu còn `published`. `20261111_remove_movie_inactive.sql` yêu cầu xử lý phim `INACTIVE` trước. |
| 6 | Timestamp phim và đánh giá | `20261111_movie_timestamps_director_names.sql` thêm timestamp, cho phép đạo diễn trùng tên. `20261111_movie_rating_timestamps_not_null.sql` điền timestamp thiếu trước khi đặt NOT NULL. |
| 7 | Đơn và vé | `20261111_booking_booked_staff.sql`, `20261111_ticket_checked_in_by.sql`, `20261111_ticket_status_booking_code_not_null.sql`. Sửa NULL ở trạng thái vé hoặc mã đơn trước. |
| 8 | Tách payment một-một | `20261111_extract_booking_payments.sql`. Đối chiếu dữ liệu rồi mới xóa các cột payment trong `bookings`. |
| 9 | Dọn cấu hình và bảng cũ | `20261111_remove_per_movie_ticket_limit.sql`. `20261111_remove_staff_handover.sql` **trước** `20261111_remove_staff_scheduling.sql` (bản đầu còn giữ `STAFF_SCHEDULE`, bản sau mới loại). `20261111_drop_unused_food_stock_transactions.sql` chỉ xóa bảng lịch sử cũ, tồn hiện tại vẫn ở `foods`. |

## Kiểm tra sau khi đổi schema

- `mvn test` gồm `RepositoryQueryValidationTest` (kiểm tra mọi JPQL không cần MySQL) và các test ràng buộc schema.
- Khởi động thử trên database rỗng và trên một bản sao có dữ liệu.
- `PaymentPersistenceIntegrationTest` chạy trên bản sao MySQL, Flyway tự migrate bản sao khi test khởi động. Xem [testing.md](../07-development/testing.md#test-cần-mysql).
