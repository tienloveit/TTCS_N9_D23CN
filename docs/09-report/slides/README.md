# Slide bảo vệ

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Đặt file thuyết trình ở thư mục này, ví dụ `movieptit-bao-ve.pptx` và bản xuất `movieptit-bao-ve.pdf`. Ảnh dùng trong slide lấy từ [screenshots/](../screenshots/) và [diagrams/](../../03-architecture/diagrams/), không chụp lại.

## Dàn ý gợi ý (12–15 slide, khoảng 15 phút)

| # | Slide | Nội dung | Nguồn |
| --- | --- | --- | --- |
| 1 | Bìa | Tên đề tài, nhóm 9, lớp D23CN, giảng viên hướng dẫn | |
| 2 | Bài toán | Chuỗi rạp nhiều chi nhánh, hai kênh bán, bốn nhóm người dùng | [overview.md](../../02-domain/overview.md#bài-toán) |
| 3 | Chức năng | Ca sử dụng theo vai trò | `use-case.png` |
| 4 | Kiến trúc | SPA React, Spring Boot, MySQL, Redis, VNPay, Google, SMTP | `system-context.png` |
| 5 | Cơ sở dữ liệu | ERD và ba quan hệ chính | `erd.png`, [erd.md](../../05-database/erd.md#các-quan-hệ-quan-trọng) |
| 6 | Đặt vé online | Chọn ghế realtime, giữ ghế 6 phút, thanh toán | `booking-online-sequence.png` |
| 7 | Chống bán trùng ghế | Khóa DB kết hợp Redis | [ADR-0002](../../08-decisions/0002-seat-hold-redis-and-db-lock.md) |
| 8 | Trạng thái đơn | Vòng đời đơn, vé, thanh toán | `booking-state.png` |
| 9 | Bán vé tại quầy và soát vé | Khách vãng lai, tiền mặt, VNPay tại quầy, khung giờ soát | Ảnh màn quầy, màn soát vé |
| 10 | Hoàn tiền | Ghi lần thử trước khi gọi cổng, không hoàn trùng | `refund-sequence.png`, [ADR-0006](../../08-decisions/0006-refund-commit-before-gateway.md) |
| 11 | Bảo mật | JWT, refresh dùng một lần, phân quyền ba lớp | [ADR-0001](../../08-decisions/0001-refresh-token-redis-single-use.md), [roles-permissions.md](../../02-domain/roles-permissions.md) |
| 12 | Quản trị và báo cáo | Dashboard, doanh thu, vận hành, XLSX | Ảnh dashboard |
| 13 | Kiểm thử | Số test tự động, kết quả test case theo vai trò | [testing.md](../../07-development/testing.md), [test-cases/](../test-cases/) |
| 14 | Kết luận | Kết quả, hạn chế, hướng phát triển | [bao-cao.md — Chương 6](../bao-cao.md#chương-6-kết-luận) |
| 15 | Demo | Kịch bản demo trực tiếp | Mục dưới |

## Kịch bản demo

Chuẩn bị trước: backend và frontend chạy, dữ liệu `demo-seed.mjs`, hai trình duyệt (khách và nhân viên), VNPay sandbox đã cấu hình. Đặt `booking.holdMinutes` về 6.

1. Khách xem lịch chiếu, chọn suất, chọn ghế. Trình duyệt thứ hai thấy ghế chuyển đang giữ.
2. Áp mã khuyến mãi, thanh toán VNPay bằng thẻ test, xem vé QR.
3. Nhân viên bán vé tiền mặt tại quầy cùng suất, in phiếu.
4. Nhân viên soát vé của khách bằng QR.
5. Khách khác yêu cầu hoàn, quản lý duyệt, ghế trống lại.
6. Quản lý xem báo cáo doanh thu, xuất XLSX.

Có phương án dự phòng nếu mất mạng: quay sẵn video demo và đặt ở thư mục này.
