# Ảnh màn hình

> Đối chiếu mã nguồn ngày 2026-11-25, commit `b16458a` và thay đổi đang làm việc.

Ảnh dùng chung cho báo cáo, slide và [README gốc](../../../README.md). Danh sách dưới gồm cả ảnh đã có và ảnh cần chụp.

## Quy ước

- Tên file: `<vai-trò>-<màn-hình>[-<trạng-thái>].png`, chữ thường, kebab-case, không dấu. Ví dụ `user-seat-select.png`, `staff-checkin-success.png`, `manager-refund-unknown.png`.
- Vai trò: `public`, `user`, `staff`, `manager`, `admin`.
- PNG, chiều rộng 1440 px cho màn desktop, 390 px cho màn điện thoại (thêm hậu tố `-mobile`).
- Chụp trên dữ liệu demo. Không để lộ email, SĐT thật, token hay khóa bí mật trong ảnh.
- Ảnh lỗi khi kiểm thử đặt tên theo mã ca, ví dụ `fail-S-08.png`.

## Danh sách cần chụp

| File | Màn hình | Dùng ở |
| --- | --- | --- |
| `public-home.png` | Trang chủ | README, báo cáo 3.8 |
| `public-movie-detail.png` | Chi tiết phim | Báo cáo 3.8 |
| [`public-branch-schedule.png`](public-branch-schedule.png) | Lịch chiếu theo rạp | Báo cáo 3.8, review giao diện |
| [`user-profile.png`](user-profile.png) | Tài khoản, hạng thành viên và ưu đãi | Review giao diện |
| [`user-navbar-account-mobile.png`](user-navbar-account-mobile.png) | Nhóm tài khoản trong ngăn kéo điện thoại | Review giao diện |
| `user-seat-select.png` | Chọn ghế, có ghế đang giữ và đã bán | README, báo cáo 2.3, slide 6 |
| `user-payment.png` | Trang thanh toán có đếm ngược và mã khuyến mãi | Báo cáo 2.3 |
| `user-my-bookings.png` | Vé của tôi | Báo cáo 3.8 |
| `user-ticket-qr.png` | Vé QR | Slide 6 |
| `staff-dashboard.png` | Dashboard nhân viên, đối soát két | Báo cáo 3.8 |
| `staff-booking-seats.png` | Màn bán vé, bước chọn ghế | Slide 9 |
| `staff-booking-checkout.png` | Màn bán vé, bước thu tiền | Báo cáo 2.4 |
| `staff-checkin-success.png` | Soát vé hợp lệ | Slide 9 |
| `manager-showtime-calendar.png` | Lịch suất chiếu theo phòng | Báo cáo 3.8 |
| `manager-refunds.png` | Danh sách hoàn tiền | Báo cáo 2.5 |
| `manager-revenue.png` | Báo cáo doanh thu | Slide 12 |
| `admin-dashboard.png` | Dashboard quản trị | README, slide 12 |
| `admin-bookings.png` | Quản lý đơn | Báo cáo 3.8 |
| `admin-movie-form.png` | Form phim | Báo cáo 3.8 |
| `admin-settings.png` | Cấu hình hệ thống | Báo cáo 2.7 |
