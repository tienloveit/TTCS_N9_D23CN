# Tài liệu MoviePTIT

> Đối chiếu mã nguồn ngày 2026-11-25, commit `6e80be9`.

Thư mục này là nguồn tài liệu chính của dự án. Mỗi chủ đề chỉ có một file làm nguồn chính, các nơi khác chỉ đặt link tới file đó. Đầu mỗi file ghi ngày và commit đã đối chiếu. Khi sửa code làm thay đổi nội dung một file, cập nhật file đó và dòng đối chiếu trong cùng commit.

## Lộ trình đọc

| Người đọc | Thứ tự gợi ý |
| --- | --- |
| Thành viên mới | [01 Chạy dự án](01-getting-started/requirements.md) → [02 Nghiệp vụ](02-domain/overview.md) → [03 Kiến trúc](03-architecture/overview.md) → [04 API](04-api/conventions.md) → [05 Dữ liệu](05-database/erd.md) → [06 Tích hợp](06-integrations/vnpay.md) → [07 Làm việc với code](07-development/coding-conventions.md) |
| Người làm frontend | [02 Nghiệp vụ](02-domain/overview.md) → [04 API](04-api/conventions.md), [endpoint](04-api/endpoints.md), [realtime](04-api/realtime.md) → [03 Frontend](03-architecture/frontend.md) → [Design system vận hành](03-architecture/ops-design-system.md) → [Thêm trang](07-development/how-to/add-page.md) |
| Người làm backend | [02 Nghiệp vụ](02-domain/overview.md) → [03 Backend](03-architecture/backend.md) → [04 API](04-api/conventions.md) → [05 Dữ liệu](05-database/erd.md) → [Thêm endpoint](07-development/how-to/add-endpoint.md), [thêm migration](07-development/how-to/add-migration.md) |
| Giảng viên chấm | [02 Nghiệp vụ](02-domain/overview.md) → [03 Kiến trúc](03-architecture/overview.md) → [05 Dữ liệu](05-database/erd.md) → [09 Báo cáo](09-report/bao-cao.md) |

## Mục lục

### [01-getting-started](01-getting-started/) — chạy được dự án

| File | Trả lời câu hỏi |
| --- | --- |
| [requirements.md](01-getting-started/requirements.md) | Máy cần cài gì? |
| [configuration.md](01-getting-started/configuration.md) | Phải điền những biến môi trường nào? |
| [run-local.md](01-getting-started/run-local.md) | Chạy từng phần theo thứ tự nào? |
| [demo-data.md](01-getting-started/demo-data.md) | Lấy dữ liệu mẫu và tài khoản đăng nhập ở đâu? |
| [troubleshooting.md](01-getting-started/troubleshooting.md) | Gặp lỗi khi chạy thì sửa thế nào? |

### [02-domain](02-domain/) — nghiệp vụ

| File | Trả lời câu hỏi |
| --- | --- |
| [overview.md](02-domain/overview.md) | Hệ thống giải quyết bài toán gì? |
| [glossary.md](02-domain/glossary.md) | Từ này nghĩa là gì? |
| [roles-permissions.md](02-domain/roles-permissions.md) | Ai được làm gì, ở phạm vi nào? |
| [booking-lifecycle.md](02-domain/booking-lifecycle.md) | Một đơn đi qua những trạng thái nào? |
| [payment-refund.md](02-domain/payment-refund.md) | Thanh toán và hoàn tiền diễn ra thế nào? |
| [promotion-membership.md](02-domain/promotion-membership.md) | Giảm giá và hạng thành viên tính ra sao? |

### [03-architecture](03-architecture/) — hệ thống được ghép thế nào

| File | Trả lời câu hỏi |
| --- | --- |
| [overview.md](03-architecture/overview.md) | Các thành phần nói chuyện với nhau ra sao? |
| [backend.md](03-architecture/backend.md) | Code backend tổ chức theo tầng nào? |
| [frontend.md](03-architecture/frontend.md) | Code frontend tổ chức thế nào? |
| [ops-design-system.md](03-architecture/ops-design-system.md) | Màn Staff, Manager, Admin phải trông và hành xử thế nào? |
| [diagrams/](03-architecture/diagrams/) | File nguồn sơ đồ để xuất ảnh cho báo cáo |

### [04-api](04-api/) — hợp đồng giữa frontend và backend

| File | Trả lời câu hỏi |
| --- | --- |
| [conventions.md](04-api/conventions.md) | Mọi API tuân theo quy ước chung nào? |
| [endpoints.md](04-api/endpoints.md) | Có những endpoint nào? |
| [realtime.md](04-api/realtime.md) | Cập nhật ghế realtime hoạt động thế nào? |

### [05-database](05-database/) — dữ liệu

| File | Trả lời câu hỏi |
| --- | --- |
| [erd.md](05-database/erd.md) | Các bảng liên kết với nhau thế nào? |
| [data-dictionary.md](05-database/data-dictionary.md) | Cột này lưu gì, nhận giá trị nào? |
| [migrations.md](05-database/migrations.md) | Thay đổi schema bằng cách nào? |

### [06-integrations](06-integrations/) — dịch vụ bên ngoài

| File | Trả lời câu hỏi |
| --- | --- |
| [vnpay.md](06-integrations/vnpay.md) | Kết nối VNPay thế nào? |
| [google-oauth.md](06-integrations/google-oauth.md) | Đăng nhập Google cấu hình ra sao? |
| [email.md](06-integrations/email.md) | Gửi mail thế nào? |

### [07-development](07-development/) — làm việc với code

| File | Trả lời câu hỏi |
| --- | --- |
| [coding-conventions.md](07-development/coding-conventions.md) | Viết code theo chuẩn nào? |
| [git-workflow.md](07-development/git-workflow.md) | Làm việc với Git thế nào? |
| [testing.md](07-development/testing.md) | Kiểm tra code bằng cách nào? |
| [how-to/add-endpoint.md](07-development/how-to/add-endpoint.md) | Thêm một API mới cần những bước nào? |
| [how-to/add-page.md](07-development/how-to/add-page.md) | Thêm một trang frontend thế nào? |
| [how-to/add-migration.md](07-development/how-to/add-migration.md) | Đổi schema an toàn thế nào? |

### [08-decisions](08-decisions/) — lý do chọn giải pháp (ADR)

ADR đã viết thì không sửa nội dung. Khi đổi quyết định, viết ADR mới và ghi "Thay thế bởi ADR-xxxx" vào trạng thái của ADR cũ.

| ADR | Quyết định | Trạng thái |
| --- | --- | --- |
| [0000](08-decisions/0000-template.md) | Mẫu ADR | — |
| [0001](08-decisions/0001-refresh-token-redis-single-use.md) | Refresh token lưu trong Redis và chỉ dùng được một lần | Chấp nhận |
| [0002](08-decisions/0002-seat-hold-redis-and-db-lock.md) | Giữ ghế bằng Redis kết hợp khóa ticket trong DB | Chấp nhận |
| [0003](08-decisions/0003-separate-payment-from-booking.md) | Tách `Payment` khỏi `Booking` | Chấp nhận |
| [0004](08-decisions/0004-disable-open-session-in-view.md) | Tắt Open Session in View | Chấp nhận |
| [0005](08-decisions/0005-flyway-owns-schema.md) | Flyway quản lý schema, Hibernate chỉ kiểm tra | Chấp nhận |
| [0006](08-decisions/0006-refund-commit-before-gateway.md) | Hoàn tiền VNPay ghi lần thử trước khi gọi cổng | Chấp nhận |
| [0007](08-decisions/0007-room-technology-vs-screening-format.md) | Tách công nghệ phòng và định dạng chiếu | Chấp nhận |

### [09-report](09-report/) — nộp môn TTCS

| File | Trả lời câu hỏi |
| --- | --- |
| [bao-cao.md](09-report/bao-cao.md) | Báo cáo môn gồm những gì? |
| [test-cases/](09-report/test-cases/) | Đã kiểm thử những kịch bản nào? |
| [slides/](09-report/slides/) | File thuyết trình bảo vệ |
| [screenshots/](09-report/screenshots/) | Ảnh màn hình dùng chung cho báo cáo và slide |

## File cho AI

[CLAUDE.md](../CLAUDE.md) và [AGENTS.md](../AGENTS.md) ở gốc, trong [backend/](../backend/CLAUDE.md) và [frontend/](../frontend/CLAUDE.md) chỉ giữ lệnh, quy tắc bắt buộc và bản đồ điểm vào. Nghiệp vụ và quy trình nằm trong `docs/`.
