# ADR-0004: Tắt Open Session in View

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-21
- **Liên quan:** commit `3b98265`, `a0cb149`; `application.yaml`; `ReadEndpointsSmokeTest`; [backend.md](../03-architecture/backend.md#tải-dữ-liệu-jpa)

## Bối cảnh

Spring Boot mặc định bật `spring.jpa.open-in-view`, giữ `EntityManager` mở tới hết request. Nhờ vậy controller và Jackson đọc được quan hệ lazy sau khi transaction của service đã đóng. Hệ quả trong dự án:

- Truy vấn phát sinh ngầm lúc serialize, khó thấy N+1 query trong báo cáo và danh sách đơn.
- Kết nối DB bị giữ suốt request, kể cả khi đang chờ VNPay hay gửi mail.
- `BookingRefundService` cần đọc lại dữ liệu mới dưới khóa giữa hai transaction, nhưng persistence context dùng chung theo request có thể trả entity cũ.

## Quyết định

- Đặt `spring.jpa.open-in-view: false`.
- Mọi `@ManyToOne` chuyển sang `LAZY`, bật `hibernate.default_batch_fetch_size: 50` để gom các lần tải.
- Map entity sang DTO bên trong method `@Transactional` của service. Controller không nhận entity.
- `ReadEndpointsSmokeTest` gọi mọi API GET với từng vai trò để bắt `LazyInitializationException`.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Tắt OSIV, map trong service (đã chọn) | Truy vấn nằm trong ranh giới rõ ràng, kết nối DB trả sớm | Phải sửa mọi chỗ đọc lazy ngoài transaction. Lỗi chỉ lộ khi chạy. |
| Giữ OSIV | Không phải sửa gì | Truy vấn ngầm, giữ kết nối lâu, persistence context dài |
| Giữ OSIV, thêm `@EntityGraph` ở chỗ chậm | Sửa ít | Không giải quyết được việc giữ kết nối và dữ liệu cũ |

## Hệ quả

- Code mới phải map DTO trong transaction. Trả entity từ service gây lỗi khi serialize.
- Không dùng `findFirst` hay `Pageable` cùng `@EntityGraph` có collection, vì Hibernate cắt trang trong bộ nhớ. Dùng cách lấy ID có giới hạn rồi tải chi tiết.
- Endpoint đọc mới phải được thêm vào `ReadEndpointsSmokeTest`.
