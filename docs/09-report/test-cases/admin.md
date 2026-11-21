# Ca kiểm thử: Quản trị viên (ADMIN)

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- Người kiểm thử:
- Ngày chạy:
- Commit đã thử:

Đăng nhập bằng `admin`. Đặt lại các tham số đã đổi ở A-06, A-07, A-08 sau khi thử.

| Mã | Chức năng | Tiền điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| --- | --- | --- | --- | --- | --- |
| A-01 | Phim nháp và công khai | — | 1) Tạo phim, để ở chế độ nháp<br>2) Xem `/movies` bằng tài khoản khách<br>3) Chuyển phim sang công khai | Phim nháp không hiện với khách, mở trực tiếp báo không tồn tại. Sau khi công khai thì hiện. | |
| A-02 | Upload poster | — | 1) Tải ảnh JPG dưới 5 MB<br>2) Tải ảnh trên 5 MB<br>3) Tải file PDF | Ảnh hợp lệ tải được và hiển thị. Hai trường hợp sau bị từ chối. | |
| A-03 | Tạo chi nhánh, phòng, ghế | — | 1) Tạo chi nhánh mới<br>2) Tạo phòng IMAX<br>3) Tạo sơ đồ ghế có VIP và COUPLE | Tạo được. Mã phòng trùng trong cùng chi nhánh bị từ chối. | |
| A-04 | Xóa chi nhánh đang dùng | Chi nhánh `CN-HCM-01` có nhân viên | 1) Xóa chi nhánh | Báo dữ liệu đang được dùng, gợi ý ngừng hoạt động thay vì xóa (409). | |
| A-05 | Tạo quản lý | Chi nhánh từ A-03 | 1) Tạo tài khoản MANAGER, gán chi nhánh<br>2) Tạo MANAGER không chọn chi nhánh | Bước 1 tạo được, quản lý mới chỉ thấy chi nhánh của mình. Bước 2 bị từ chối. | |
| A-06 | Đổi thời gian giữ ghế | — | 1) Mở `/admin/settings`, đặt `booking.holdMinutes = 2`<br>2) Khách tạo đơn mới | Đơn mới có đồng hồ đếm ngược khoảng 2 phút. Nhật ký có `SYSTEM_SETTING_UPDATED`. | |
| A-07 | Đổi số vé tối đa | — | 1) Đặt `booking.maxTicketsPerTransaction = 4`<br>2) Khách đặt 5 ghế | Đơn 5 ghế bị từ chối, đơn 4 ghế được. | |
| A-08 | Đổi hạn yêu cầu hoàn | Một đơn đã thanh toán | 1) Đặt `refund.windowHours = 1`<br>2) Mở đơn ở "Vé của tôi" của khách | Hạn hoàn hiển thị bằng thời điểm thanh toán cộng 1 giờ. | |
| A-09 | Dashboard toàn hệ thống | Có dữ liệu `demo-seed.mjs` | 1) Mở `/admin`<br>2) Đổi khoảng ngày | Mặc định 30 ngày gần nhất. Số liệu gồm mọi chi nhánh và đổi theo khoảng ngày. | |
| A-10 | Danh sách đơn | Có nhiều hơn 15 đơn | 1) Mở `/admin/bookings`, lọc theo chi nhánh và trạng thái<br>2) Tìm theo mã đơn<br>3) Chọn vài đơn ở trang 1 và trang 2, xuất XLSX | Mỗi trang 15 đơn, thẻ thống kê theo bộ lọc. Lựa chọn giữ qua các trang. File XLSX có đúng các đơn đã chọn. | |
| A-11 | Xóa suất đã có đơn | Một suất có đơn | 1) Xóa suất đó | Bị từ chối vì suất đã có đơn. Suất chưa có đơn xóa được. | |
| A-12 | Bán vé tại quầy | Suất ở chi nhánh bất kỳ | 1) Mở `/staff/booking` bằng `admin`, bán một vé tiền mặt | Bán được ở mọi chi nhánh. Đơn ghi người bán là `admin`. | |
| A-13 | Duyệt hoàn mọi chi nhánh | Đơn chờ hoàn ở hai chi nhánh | 1) Mở `/admin/refunds` | Thấy và xử lý được đơn của cả hai chi nhánh. | |
| A-14 | API cleanup chỉ có ở môi trường dev | Backend chạy không có profile `dev` | 1) Gọi `DELETE /api/v1/cleanup/database` bằng token `admin` | Trả 404, không xóa dữ liệu. | |
