# Ca kiểm thử: Quản lý chi nhánh (MANAGER)

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- Người kiểm thử:
- Ngày chạy:
- Commit đã thử:

Tài khoản `manager` thuộc chi nhánh `CN-HCM-01`. Các ca cần chi nhánh khác dùng `CN-HN-01` (quản lý `manager3` nếu đã chạy `demo-seed.mjs`).

| Mã | Chức năng | Tiền điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| --- | --- | --- | --- | --- | --- |
| M-01 | Điều hướng khu quản lý | — | 1) Đăng nhập `manager`<br>2) Gõ `/admin/bookings`<br>3) Gõ `/manager/movies`, `/manager/settings` | Vào `/manager`. Bước 2 chuyển sang `/manager/bookings`. Bước 3 chuyển về `/manager`. | |
| M-02 | Tạo suất chiếu | Phòng `ACTIVE` của `CN-HCM-01` | 1) Mở Suất chiếu, tạo suất với định dạng 3D, giá 90.000<br>2) Mở sơ đồ ghế của suất ở trang khách | Tạo thành công. Mọi ghế trống, giá 90.000. Suất hiện ở lịch chiếu của rạp. | |
| M-03 | Suất trùng giờ | Suất từ M-02 | 1) Tạo suất cùng phòng, bắt đầu 10 phút sau khi suất M-02 kết thúc | Báo trùng lịch, không tạo. | |
| M-04 | Đổi giá suất | Suất A chưa bán vé nào, suất B đã có vé bán | 1) Đổi giá suất A<br>2) Đổi giá suất B | Suất A đổi được, giá vé mới hiện ở sơ đồ ghế. Suất B báo không đổi được giá vì đã có ghế giữ hoặc đã bán. | |
| M-05 | Không thao tác chi nhánh khác | Biết ID một phòng của `CN-HN-01` | 1) Gọi `POST /api/showtime` với `roomId` đó bằng token `manager` | Bị từ chối (403). Danh sách chi nhánh, phòng ở giao diện chỉ có `CN-HCM-01`. | |
| M-06 | Sửa sơ đồ ghế | Phòng chưa có suất chiếu | 1) Thêm một hàng ghế, đổi vài ghế sang VIP<br>2) Lưu | Lưu được. Sức chứa phòng bằng số ghế mới. | |
| M-07 | Tạo nhân viên | — | 1) Mở Người dùng, tạo tài khoản mới | Tài khoản mới là STAFF của `CN-HCM-01`. Danh sách người dùng chỉ có STAFF của chi nhánh. | |
| M-08 | Khóa nhân viên | Tài khoản STAFF từ M-07 | 1) Đổi trạng thái sang BLOCKED<br>2) Đăng nhập bằng tài khoản đó | Không đăng nhập được. | |
| M-09 | Khuyến mãi theo chi nhánh | — | 1) Tạo mã giảm 10%<br>2) Khách áp mã cho suất ở `CN-HCM-01`<br>3) Khách áp mã cho suất ở `CN-HN-01` | Mã thuộc `CN-HCM-01`. Bước 2 áp được. Bước 3 bị từ chối. | |
| M-10 | Duyệt hoàn tiền mặt | Đơn tiền mặt đang chờ hoàn (S-15) | 1) Mở Hoàn tiền, duyệt đơn, nhập ghi chú | Đơn chuyển "Đã hoàn tiền", ghế trống lại, tổng chi tiêu của khách giảm. Nhật ký có `REFUND_APPROVED`. | |
| M-11 | Duyệt hoàn VNPay | Đơn VNPay đang chờ hoàn (U-17) | 1) Duyệt đơn<br>2) Nếu chưa xác nhận, bấm "Kiểm tra kết quả" | Chỉ báo thành công khi đơn chuyển "Đã hoàn tiền". Nếu cổng chưa xác nhận, đơn vẫn chờ, hiện thông điệp của cổng, nút từ chối bị khóa. | |
| M-12 | Từ chối hoàn | Đơn đang chờ hoàn, không có lần hoàn VNPay đang chờ | 1) Từ chối, nhập ghi chú | Đơn trở về "Hoàn tất", vé vẫn dùng được. Nhật ký có `REFUND_REJECTED`. | |
| M-13 | Không duyệt hoàn chi nhánh khác | Một đơn chờ hoàn ở `CN-HN-01` | 1) Xem danh sách hoàn tiền<br>2) Gọi `POST /api/booking/{id}/refund-process` cho đơn đó | Danh sách không có đơn của chi nhánh khác. API bị từ chối. | |
| M-14 | Báo cáo | Có đơn đã thanh toán trong tháng | 1) Mở Doanh thu, lọc theo tháng<br>2) Xuất XLSX<br>3) Mở Vận hành, xuất XLSX | Số liệu chỉ của `CN-HCM-01`. File XLSX mở được bằng Excel, số tổng khớp màn hình. | |
| M-15 | Thông báo và nhật ký | Đã có yêu cầu hoàn (U-17) và thao tác bắp nước | 1) Mở Thông báo<br>2) Mở Nhật ký | Có thông báo yêu cầu hoàn. Đánh dấu đã đọc không ảnh hưởng tài khoản khác. Nhật ký chỉ có thao tác của chi nhánh. | |
