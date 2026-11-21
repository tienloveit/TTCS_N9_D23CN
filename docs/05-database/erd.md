# Sơ đồ quan hệ thực thể

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45` (schema sau Flyway V7).

Schema `cinema` trên MySQL 8, mọi bảng dùng InnoDB và `utf8mb4_unicode_ci`. Sơ đồ chỉ ghi khóa và cột chính. Toàn bộ cột nằm trong [data-dictionary.md](data-dictionary.md). Nguồn sơ đồ để xuất ảnh: [erd.mmd](../03-architecture/diagrams/erd.mmd).

```mermaid
erDiagram
    branches ||--o{ rooms : "có"
    rooms ||--o{ seats : "có"
    rooms ||--o{ showtimes : "chiếu"
    movies ||--o{ showtimes : "được chiếu"
    directors |o--o{ movies : "đạo diễn"
    movies ||--o{ movie_genres : "thuộc"
    genres ||--o{ movie_genres : "gồm"
    movies ||--o{ movie_ratings : "được đánh giá"
    users ||--o{ movie_ratings : "đánh giá"
    showtimes ||--o{ tickets : "gồm"
    seats ||--o{ tickets : "ứng với"
    showtimes ||--o{ bookings : "thuộc"
    users |o--o{ bookings : "khách (user_id)"
    users |o--o{ bookings : "người bán (booked_staff)"
    bookings |o--o{ tickets : "giữ hoặc đã mua"
    users |o--o{ tickets : "soát vé (checked_in_by)"
    bookings ||--|| payments : "thanh toán"
    users |o--o{ payments : "xử lý hoàn (refund_processed_by)"
    bookings ||--o{ booking_foods : "kèm"
    foods ||--o{ booking_foods : "được đặt"
    bookings |o--o{ payment_events : "nhật ký"
    branches |o--o{ users : "nhân viên, quản lý"
    branches |o--o{ foods : "bán"
    branches |o--o{ promotions : "áp dụng"
    promotions |o..o{ bookings : "promotion_code, không FK"
    notifications ||--o{ notification_reads : "đã đọc"
    users ||--o{ notification_reads : "đọc"

    branches {
        bigint id PK
        varchar branch_code UK
        varchar name
        enum status
    }
    rooms {
        bigint id PK
        bigint branch_id FK
        varchar code "UK cùng branch_id"
        enum room_technology
        int seat_capacity
        enum status
    }
    seats {
        bigint id PK
        bigint room_id FK
        varchar seat_code "UK cùng room_id"
        varchar row_label
        int seat_number
        enum seat_type
    }
    movies {
        bigint id PK
        varchar movie_name
        bigint director_id FK
        boolean is_public
        enum status
        date release_date
        date end_date
    }
    directors {
        bigint id PK
        varchar name
    }
    genres {
        bigint id PK
        varchar name UK
    }
    movie_genres {
        bigint movie_id PK, FK
        bigint genre_id PK, FK
    }
    movie_ratings {
        bigint id PK
        bigint movie_id FK
        bigint user_id FK
        int score "1-5"
    }
    showtimes {
        bigint id PK
        bigint room_id FK
        bigint movie_id FK
        datetime start_time
        datetime end_time
        enum status
        enum screening_format
        decimal ticket_price
    }
    tickets {
        bigint id PK
        bigint showtime_id FK
        bigint seat_id FK
        bigint booking_id FK
        decimal price
        enum ticket_status
        varchar qr_code UK
        datetime checked_in_at
        bigint checked_in_by FK
    }
    bookings {
        bigint id PK
        varchar booking_code UK
        bigint user_id FK
        bigint booked_staff FK
        bigint showtime_id FK
        decimal total_amount
        varchar promotion_code
        decimal discount_amount
        varchar status
        datetime expires_at
    }
    payments {
        bigint id PK
        bigint booking_id FK, UK
        decimal amount
        enum payment_method
        varchar payment_status
        varchar provider_txn_id
        datetime paid_at
        varchar refund_gateway_status
    }
    booking_foods {
        bigint id PK
        bigint booking_id FK
        bigint food_id FK
        int quantity
        decimal unit_price
        decimal subtotal
    }
    foods {
        bigint id PK
        bigint branch_id FK
        varchar name
        decimal price
        int stock_quantity
        bit active
    }
    promotions {
        bigint id PK
        varchar code UK
        int discount_percent
        bigint branch_id FK
        int usage_limit
        int used_count
    }
    users {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar phone_number UK
        varchar role
        enum status
        bigint branch_id FK
        enum membership_tier
        decimal total_spending
    }
    payment_events {
        bigint id PK
        bigint booking_id FK
        varchar event_type
        varchar response_code
        bit valid_signature
    }
    notifications {
        bigint id PK
        bigint recipient_user_id
        enum recipient_role
        bigint branch_id
        enum type
    }
    notification_reads {
        bigint id PK
        bigint notification_id FK
        bigint user_id FK
        datetime read_at
    }
```

Hai bảng không có quan hệ khóa ngoại nên không có trong sơ đồ: `audit_logs` (lưu `actor_id`, `branch_id` dạng số để nhật ký tồn tại độc lập với dữ liệu gốc) và `system_settings`.

## Các quan hệ quan trọng

**Suất chiếu sinh sẵn vé.** `tickets` có một dòng cho mỗi cặp (suất, ghế), ràng buộc duy nhất `(showtime_id, seat_id)`. Vé tồn tại từ lúc tạo suất, `booking_id` null nghĩa là ghế còn trống. Đặt vé là khóa và cập nhật các dòng này, không phải chèn dòng mới. Nhờ vậy, hai người không thể mua cùng một ghế. Vé không bị xóa khi đơn hủy hay hoàn, chỉ được gỡ khỏi đơn.

**`bookings` – `payments` một-một.** `payments.booking_id` là `UNIQUE` và `ON DELETE CASCADE`. Entity `Booking` tự tạo `Payment` khi lưu, nên mọi đơn luôn có một dòng payment. Lý do tách bảng ở [ADR-0003](../08-decisions/0003-separate-payment-from-booking.md). JSON `BookingResponse` vẫn trả các trường thanh toán ở cấp ngoài cùng (`paymentStatus`, `paidAt`, `refundGatewayStatus`...).

**Hai quan hệ từ `bookings` tới `users`.** `user_id` là khách sở hữu đơn. `booked_staff` là nhân viên bán, chỉ có giá trị với đơn tại quầy. Entity gọi trường này là `staffUser`.

**Chi nhánh của dữ liệu.** Phần lớn dữ liệu xác định chi nhánh qua chuỗi `showtimes → rooms → branches`, ví dụ chi nhánh của một đơn là chi nhánh của phòng chiếu. `users.branch_id`, `foods.branch_id`, `promotions.branch_id` trỏ thẳng tới `branches`. Ở `foods` và `promotions`, null nghĩa là dùng cho mọi chi nhánh. Khóa ngoại `RESTRICT` chặn xóa chi nhánh còn nhân viên, món hoặc khuyến mãi, backend trả `RESOURCE_IN_USE`.

**Khuyến mãi gắn bằng mã, không bằng khóa ngoại.** `bookings.promotion_code` lưu chuỗi mã đã áp. Đơn cũ vẫn đọc được khi mã bị tắt.

**Nhật ký thanh toán chặn xóa đơn.** `payment_events.booking_id` có khóa ngoại không cascade. Đơn đã có giao dịch VNPay không xóa được, để dấu vết giao dịch không mất.

**Đã đọc theo từng người.** Một thông báo có thể gửi cho một người (`recipient_user_id`) hoặc một role ở một chi nhánh. Mỗi lần một người đọc là một dòng `notification_reads`, duy nhất theo `(notification_id, user_id)`.
