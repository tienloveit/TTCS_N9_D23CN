# Ca kiểm thử chức năng

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Mỗi vai trò một file. Mỗi dòng là một ca kiểm thử tay trên trình duyệt với backend thật.

| File | Vai trò | Số ca |
| --- | --- | --- |
| [user.md](user.md) | Khách hàng | 20 |
| [staff.md](staff.md) | Nhân viên quầy | 17 |
| [manager.md](manager.md) | Quản lý chi nhánh | 15 |
| [admin.md](admin.md) | Quản trị viên | 14 |

## Cách chạy

1. Chuẩn bị database demo bằng seed khi khởi động, rồi `demo-seed.mjs` nếu cần nhiều dữ liệu. Xem [demo-data.md](../../01-getting-started/demo-data.md).
2. Đăng nhập bằng tài khoản ghi ở cột "Tiền điều kiện". Mật khẩu ở [tài khoản demo](../../01-getting-started/demo-data.md#tài-khoản-demo).
3. Làm theo cột "Bước thực hiện", so với "Kết quả mong đợi".
4. Điền cột "Kết quả thực tế": **Đạt**, hoặc **Không đạt** kèm mô tả ngắn và mã issue. Chụp màn hình ca không đạt vào [screenshots/](../screenshots/).
5. Ghi người kiểm thử, ngày và commit đã thử ở đầu mỗi file.

Kết quả thực tế để trống cho tới khi chạy thật. Không điền trước.

Thời gian trong các ca dùng giá trị mặc định (giữ ghế 6 phút, job dọn 120 giây, hoàn trong 24 giờ). Có thể giảm `booking.holdMinutes` ở `/admin/settings` để thử nhanh ca hết hạn, nhớ đặt lại sau khi thử.
