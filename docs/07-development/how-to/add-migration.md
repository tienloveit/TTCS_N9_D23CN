# Thêm một migration

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Quy tắc chung và lịch sử version nằm trong [migrations.md](../../05-database/migrations.md). Ví dụ: thêm cột `foods.category` dạng enum `SNACK`, `DRINK`, `COMBO`, bắt buộc.

## Checklist

- [ ] **1. Chọn số version.** Xem file lớn nhất trong `backend/src/main/resources/db/migration/` (hiện là V7). File mới: `V8__food_category.sql`. Nếu hai nhánh cùng tạo V8, nhánh merge sau đổi số trước khi merge.
- [ ] **2. Viết SQL cho cả database rỗng lẫn database có dữ liệu.** Cột mới `NOT NULL` trên bảng đã có dòng thì làm ba bước: thêm cột cho phép NULL, điền giá trị cho dòng cũ, rồi siết `NOT NULL`.
- [ ] **3. Đặt tên ràng buộc và index** theo quy ước `uk_`, `idx_`, `chk_`, `fk_` và dùng đúng tên đó trong `@Table` của entity.
- [ ] **4. Enum.** Cột lưu VARCHAR phải có `CHECK` liệt kê giá trị. Cột `ENUM` của MySQL thì liệt kê trong `ENUM(...)`. Thêm giá trị enum về sau cần migration riêng.
- [ ] **5. Cập nhật entity** khớp kiểu, độ dài, nullable. Hibernate chạy `ddl-auto: validate` sau Flyway, nên lệch kiểu sẽ dừng backend.
- [ ] **6. Cập nhật DTO, mapper và frontend** nếu cột đi ra API.
- [ ] **7. Chạy trên database rỗng.** Tạo một schema trống, trỏ `SPRING_DATASOURCE_URL` tới đó, khởi động backend, xem log Flyway áp dụng tới V8.
- [ ] **8. Chạy trên bản sao có dữ liệu.** Sao chép database demo, khởi động backend trên bản sao. Kiểm tra dữ liệu cũ sau migration đúng như mong đợi.
- [ ] **9. Chạy test.** `.\mvnw.cmd test`. Nếu có thể, chạy thêm `PaymentPersistenceIntegrationTest` trên bản sao (xem [testing.md](../testing.md#test-cần-mysql)).
- [ ] **10. Cập nhật tài liệu:** bảng version trong [migrations.md](../../05-database/migrations.md), bảng tương ứng trong [data-dictionary.md](../../05-database/data-dictionary.md), và [erd.md](../../05-database/erd.md) nếu thêm bảng hoặc quan hệ.

## Ví dụ

```sql
-- V8: phân loại bắp nước. Món cũ được xếp vào SNACK.
ALTER TABLE foods ADD COLUMN category VARCHAR(20) NULL;

UPDATE foods SET category = 'SNACK' WHERE category IS NULL;

ALTER TABLE foods
  MODIFY COLUMN category VARCHAR(20) NOT NULL DEFAULT 'SNACK',
  ADD CONSTRAINT chk_foods_category CHECK (category IN ('SNACK', 'DRINK', 'COMBO'));
```

```java
// entity/Food.java
@Enumerated(EnumType.STRING)
@JdbcTypeCode(SqlTypes.VARCHAR)
@Column(length = 20, nullable = false)
@Builder.Default
private FoodCategory category = FoodCategory.SNACK;
```

## Giữ an toàn cho dữ liệu cũ

- Sao lưu trước khi chạy trên database thật: `mysqldump -u root -p cinema > cinema_backup.sql`.
- Siết ràng buộc thì kiểm tra dữ liệu vi phạm trước, dừng bằng thông báo rõ ràng. Mẫu trong V2 và V3:

  ```sql
  DELIMITER $$
  CREATE PROCEDURE app_v8_fail_if(IN bad_rows BIGINT, IN message VARCHAR(255))
  BEGIN
      IF bad_rows > 0 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = message;
      END IF;
  END$$
  CALL app_v8_fail_if((SELECT COUNT(*) FROM foods WHERE price < 0), 'foods.price: co gia tri am')$$
  DROP PROCEDURE app_v8_fail_if$$
  DELIMITER ;
  ```

- MySQL không rollback DDL. Viết từng bước sao cho chạy lại được (kiểm tra `information_schema` trước khi thêm cột hay ràng buộc), để khi migration dừng giữa chừng có thể sửa dữ liệu rồi chạy lại. Cách khôi phục ở [migrations.md](../../05-database/migrations.md#khi-migration-dừng-giữa-chừng).
- Đổi tên hoặc xóa cột: làm qua hai lần phát hành nếu có code cũ còn đọc cột đó. Lần đầu thêm cột mới và ghi cả hai, lần sau mới bỏ cột cũ.

## Không được làm

- Sửa file migration đã merge vào `dev`.
- Sửa bảng bằng tay trên database dùng chung rồi "bổ sung migration sau".
- Bật `spring.jpa.hibernate.ddl-auto: update`.
- Thêm code sửa schema lúc khởi động trong `BackendApplication` hay seed.
