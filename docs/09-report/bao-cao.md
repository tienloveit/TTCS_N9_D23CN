# Dàn ý báo cáo Thực tập cơ sở

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Đề tài: **Xây dựng hệ thống đặt vé xem phim MoviePTIT cho chuỗi rạp nhiều chi nhánh.** Nhóm 9, lớp D23CN.

File này là dàn ý. Nội dung mỗi mục lấy từ file nguồn được link, không viết lại ở đây. Khi soạn báo cáo Word/PDF, chép nội dung từ file nguồn rồi chỉnh văn phong. Hình lấy từ [diagrams/](../03-architecture/diagrams/) và [screenshots/](screenshots/).

## Phần mở đầu

- Trang bìa, lời cảm ơn, mục lục, danh mục hình, danh mục bảng, danh mục từ viết tắt.
- Bảng phân công công việc của các thành viên.
- Từ viết tắt và thuật ngữ: lấy từ [glossary.md](../02-domain/glossary.md).

## Chương 1. Đặt vấn đề

| Mục | Nguồn |
| --- | --- |
| 1.1 Bối cảnh và lý do chọn đề tài | [02-domain/overview.md — Bài toán](../02-domain/overview.md#bài-toán) |
| 1.2 Mục tiêu | [Chức năng](../02-domain/overview.md#chức-năng) |
| 1.3 Đối tượng sử dụng | [Người dùng](../02-domain/overview.md#người-dùng) |
| 1.4 Phạm vi: làm và không làm | [Phạm vi](../02-domain/overview.md#phạm-vi) |
| 1.5 Công nghệ sử dụng và lý do chọn | [03-architecture/overview.md — Thành phần](../03-architecture/overview.md#thành-phần), [ADR](../README.md#08-decisions--lý-do-chọn-giải-pháp-adr) |

## Chương 2. Phân tích hệ thống

| Mục | Nguồn | Hình, bảng |
| --- | --- | --- |
| 2.1 Tác nhân và ca sử dụng | [Người dùng](../02-domain/overview.md#người-dùng) | `use-case.png` |
| 2.2 Yêu cầu chức năng theo vai trò | [roles-permissions.md — Ma trận](../02-domain/roles-permissions.md#ma-trận-chức-năng) | Bảng ma trận quyền |
| 2.3 Quy trình đặt vé online | [booking-lifecycle.md — Đặt vé online](../02-domain/booking-lifecycle.md#đặt-vé-online) | `booking-online-sequence.png` |
| 2.4 Quy trình bán vé tại quầy | [Bán tại quầy](../02-domain/booking-lifecycle.md#bán-tại-quầy) | |
| 2.5 Thanh toán và hoàn tiền | [payment-refund.md](../02-domain/payment-refund.md) | `refund-sequence.png` |
| 2.6 Khuyến mãi và hạng thành viên | [promotion-membership.md](../02-domain/promotion-membership.md) | Bảng hạng |
| 2.7 Quy tắc nghiệp vụ và tham số | [Tham số nghiệp vụ](../02-domain/overview.md#tham-số-nghiệp-vụ) | |
| 2.8 Yêu cầu phi chức năng | Mục dưới | |

Yêu cầu phi chức năng nên nêu, kèm nơi hệ thống đáp ứng:

| Yêu cầu | Cách đáp ứng | Nguồn |
| --- | --- | --- |
| Không bán trùng ghế khi nhiều người đặt cùng lúc | Khóa dòng DB, khóa Redis có chủ sở hữu | [ADR-0002](../08-decisions/0002-seat-hold-redis-and-db-lock.md) |
| Cập nhật ghế tức thời | WebSocket STOMP | [realtime.md](../04-api/realtime.md) |
| Bảo mật phiên đăng nhập | JWT ngắn hạn, refresh dùng một lần, thu hồi khi đăng xuất | [ADR-0001](../08-decisions/0001-refresh-token-redis-single-use.md) |
| Phân quyền theo vai trò và chi nhánh | Ba lớp kiểm tra | [roles-permissions.md](../02-domain/roles-permissions.md#ba-lớp-kiểm-tra) |
| Không mất tiền khi cổng thanh toán lỗi | Ghi lần thử trước khi gọi cổng, nhật ký thanh toán | [ADR-0006](../08-decisions/0006-refund-commit-before-gateway.md) |
| Thời gian nhất quán | Giờ rạp ở cả DB, backend, frontend | [Thời gian](../03-architecture/overview.md#thời-gian) |

## Chương 3. Thiết kế hệ thống

| Mục | Nguồn | Hình, bảng |
| --- | --- | --- |
| 3.1 Kiến trúc tổng thể | [03-architecture/overview.md](../03-architecture/overview.md) | `system-context.png` |
| 3.2 Thiết kế backend theo tầng | [backend.md](../03-architecture/backend.md) | Bảng package |
| 3.3 Thiết kế frontend | [frontend.md](../03-architecture/frontend.md) | Bảng route |
| 3.4 Thiết kế cơ sở dữ liệu | [erd.md](../05-database/erd.md), [data-dictionary.md](../05-database/data-dictionary.md) | `erd.png`, bảng từ điển dữ liệu của các bảng chính |
| 3.5 Biểu đồ trạng thái | [booking-lifecycle.md — Trạng thái](../02-domain/booking-lifecycle.md#trạng-thái) | `booking-state.png`, `ticket-state.png`, `payment-state.png` |
| 3.6 Thiết kế API | [conventions.md](../04-api/conventions.md), [endpoints.md](../04-api/endpoints.md) | Bảng endpoint rút gọn theo nhóm |
| 3.7 Thiết kế tích hợp | [vnpay.md](../06-integrations/vnpay.md), [google-oauth.md](../06-integrations/google-oauth.md), [email.md](../06-integrations/email.md) | Sơ đồ đăng nhập Google |
| 3.8 Thiết kế giao diện | [frontend.md — Màn hình chính](../03-architecture/frontend.md#màn-hình-chính) | Ảnh màn hình mỗi vai trò |
| 3.9 Các quyết định thiết kế | [08-decisions](../README.md#08-decisions--lý-do-chọn-giải-pháp-adr) | Mỗi ADR một đoạn: bối cảnh, lựa chọn, lý do |

## Chương 4. Cài đặt

| Mục | Nguồn |
| --- | --- |
| 4.1 Môi trường phát triển | [requirements.md](../01-getting-started/requirements.md) |
| 4.2 Cấu trúc mã nguồn | [backend.md — Package](../03-architecture/backend.md#package), [frontend.md — Cấu trúc thư mục](../03-architecture/frontend.md#cấu-trúc-thư-mục) |
| 4.3 Cài đặt các chức năng tiêu biểu | Giữ ghế: [Giữ ghế](../02-domain/booking-lifecycle.md#giữ-ghế). Thanh toán: [Return và IPN](../02-domain/payment-refund.md#return-và-ipn). Hoàn tiền: [Hoàn qua VNPay](../02-domain/payment-refund.md#hoàn-qua-vnpay). Xác thực: [Bảo mật](../03-architecture/backend.md#bảo-mật). Kèm đoạn code ngắn từ file nguồn. |
| 4.4 Cấu hình và triển khai | [configuration.md](../01-getting-started/configuration.md), [run-local.md](../01-getting-started/run-local.md) |
| 4.5 Quản lý mã nguồn và quy trình nhóm | [git-workflow.md](../07-development/git-workflow.md), [coding-conventions.md](../07-development/coding-conventions.md) |

## Chương 5. Kiểm thử

| Mục | Nguồn |
| --- | --- |
| 5.1 Chiến lược kiểm thử | [testing.md](../07-development/testing.md) |
| 5.2 Kiểm thử tự động | [Phần có test tự động](../07-development/testing.md#phần-có-test-tự-động). Nêu số test và kết quả lần chạy cuối. |
| 5.3 Kiểm thử chức năng theo vai trò | [test-cases/user.md](test-cases/user.md), [staff.md](test-cases/staff.md), [manager.md](test-cases/manager.md), [admin.md](test-cases/admin.md) |
| 5.4 Tổng hợp kết quả | Bảng: số ca theo vai trò, số đạt, số không đạt, lỗi tìm được và cách xử lý |

Trước khi nộp, chạy lại toàn bộ test case trên bản `main`, điền cột "Kết quả thực tế", người kiểm thử và ngày.

## Chương 6. Kết luận

| Mục | Nội dung |
| --- | --- |
| 6.1 Kết quả đạt được | Đối chiếu mục tiêu ở 1.2 với chức năng đã hoàn thành |
| 6.2 Hạn chế | [Hạn chế đã biết](../02-domain/booking-lifecycle.md#hạn-chế-đã-biết), [Phạm vi — hệ thống không làm](../02-domain/overview.md#phạm-vi), các mục "Hệ quả" trong ADR |
| 6.3 Hướng phát triển | Giá vé theo loại ghế, đồng bộ lại sơ đồ ghế khi kết nối lại, lọc bắp nước theo chi nhánh ở trang khách, CI chạy test tự động, đăng xuất mọi thiết bị, triển khai nhiều bản backend với broker STOMP ngoài |

## Tài liệu tham khảo và phụ lục

- Tài liệu Spring Boot, Spring Security, React, Vite, Mermaid.
- Đặc tả VNPay: thanh toán và [querydr & refund](https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html).
- Phụ lục A: hướng dẫn cài đặt, lấy từ [01-getting-started](../01-getting-started/run-local.md).
- Phụ lục B: danh sách endpoint, lấy từ [endpoints.md](../04-api/endpoints.md).
- Phụ lục C: tài khoản demo, lấy từ [demo-data.md](../01-getting-started/demo-data.md#tài-khoản-demo).
