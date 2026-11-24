# Ca kiểm thử: Khách hàng (USER)

> Đối chiếu mã nguồn ngày 2026-11-25, commit `c9504d3`.

- Người kiểm thử:
- Ngày chạy:
- Commit đã thử:

| Mã | Chức năng | Tiền điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| --- | --- | --- | --- | --- | --- |
| U-01 | Đăng ký | Chưa đăng nhập | 1) Mở `/register`<br>2) Nhập tài khoản, email, mật khẩu mới<br>3) Gửi, rồi đăng nhập bằng tài khoản vừa tạo | Đăng ký thành công. Đăng nhập được, role USER, hạng Đồng. Đăng ký lại cùng tài khoản hoặc email báo trùng. | |
| U-02 | Đăng nhập sai mật khẩu | Có tài khoản `user` | 1) Mở `/login`<br>2) Nhập `user` với mật khẩu sai | Báo sai tài khoản hoặc mật khẩu (HTTP 401), không lưu token. | |
| U-03 | Đăng nhập Google | Đã cấu hình Google OAuth | 1) Bấm đăng nhập với Google<br>2) Chọn tài khoản Google | Về `/oauth2/callback` rồi vào trang chủ đã đăng nhập. Lần đầu tạo tài khoản USER mới, lần sau vào đúng tài khoản cũ. | |
| U-04 | Quên mật khẩu | Tài khoản có email nhận được, SMTP đã cấu hình | 1) Mở `/forgot-password`, nhập email<br>2) Nhập OTP trong email và mật khẩu mới<br>3) Đăng nhập bằng mật khẩu mới | Nhận email OTP 6 chữ số. Đổi mật khẩu thành công. OTP sai báo lỗi. Gửi OTP quá 5 lần trong 1 phút báo thử lại sau (429). | |
| U-05 | Xem phim và lịch chiếu | Có dữ liệu demo | 1) Mở `/movies`, lọc theo thể loại<br>2) Mở chi tiết một phim<br>3) Mở `/branches`, chọn rạp và ngày<br>4) Chuyển sang "Theo giờ", lọc buổi tối<br>5) Tải lại trang | Danh sách lọc đúng. Chi tiết có trailer, đánh giá, suất theo ngày và rạp. Lịch rạp không hiện suất đã bắt đầu. Đổi rạp giữ nguyên ngày. Bảng "Theo giờ" chỉ còn suất từ 17:00 đến 21:59. URL giữ rạp, ngày và chế độ xem sau khi tải lại. | |
| U-06 | Chặn truy cập khu quản trị | Đăng nhập `user` | 1) Gõ `/admin` trên thanh địa chỉ<br>2) Gõ `/staff/booking`<br>3) Gọi `GET /api/admin/reports/revenue` với token của `user` | Bước 1, 2 bị chuyển về trang chủ. Bước 3 trả 403. | |
| U-07 | Ghế cập nhật realtime | Hai trình duyệt, một đăng nhập `user`, một đăng nhập `user2` | 1) Cả hai mở cùng một suất ở `/showtime/:id/seats`<br>2) `user` chọn ghế A5 và đặt<br>3) Quan sát trình duyệt của `user2` | Ghế A5 ở trình duyệt `user2` chuyển sang đang giữ mà không cần tải lại. `user2` không đặt được A5. | |
| U-08 | Giới hạn số vé | Đăng nhập `user`, `booking.maxTicketsPerTransaction = 8` | 1) Chọn 9 ghế cùng suất<br>2) Đặt vé | Không tạo đơn, báo vượt số vé tối đa. | |
| U-09 | Đặt vé kèm bắp nước và mã | Có mã khuyến mãi còn hiệu lực của chi nhánh suất | 1) Chọn 2 ghế, 1 bắp nước<br>2) Đặt vé, tới trang thanh toán<br>3) Áp mã khuyến mãi | Tổng = (giá vé × 2 + giá bắp) − giảm giá, giảm giá = floor(tổng gốc × %), không vượt mức tối đa. Đồng hồ đếm ngược khoảng 6 phút. | |
| U-10 | Thanh toán VNPay thành công | Đơn từ U-09 | 1) Bấm thanh toán VNPay<br>2) Trả bằng thẻ test NCB<br>3) Quay về trang kết quả, mở "Vé của tôi" | Trang kết quả báo thành công. Đơn hoàn tất, có mã QR cho từng vé. Email vé có ảnh QR (nếu SMTP đã cấu hình). Ghế hiện đã bán với người khác. | |
| U-11 | Hủy trên trang VNPay | Đơn chờ thanh toán mới | 1) Tới trang VNPay<br>2) Bấm hủy giao dịch | Trang kết quả báo không thành công. Đơn bị hủy, ghế trở lại trống, lượt khuyến mãi (nếu có) được trả. | |
| U-12 | Đơn hết hạn giữ ghế | Đơn chờ thanh toán mới, trình duyệt khác mở cùng suất | 1) Không thanh toán, đợi hết đồng hồ đếm ngược<br>2) Đợi thêm tối đa 2 phút | Hết giờ thì không thanh toán được nữa. Trong vòng 2 phút sau hạn, đơn chuyển "Đã hủy", trình duyệt kia thấy ghế trống lại. | |
| U-13 | Giới hạn đơn chờ | Đăng nhập `user`, chưa có đơn chờ | 1) Tạo 2 đơn ở hai suất, không thanh toán<br>2) Tạo đơn thứ 3 | Đơn thứ 3 bị từ chối, báo có quá nhiều đơn chờ thanh toán. | |
| U-14 | Hủy đơn chờ | Có một đơn chờ thanh toán | 1) Mở "Vé của tôi"<br>2) Hủy đơn đang chờ | Đơn chuyển "Đã hủy", ghế trống lại. Đơn đã thanh toán không có nút hủy. | |
| U-15 | Đổi mã sau khi đã lấy URL VNPay | Đơn chờ, đã bấm thanh toán VNPay | 1) Từ trang VNPay bấm quay lại trang thanh toán của đơn<br>2) Áp hoặc bỏ mã khuyến mãi | Không đổi được mã, vì số tiền đã ký trong URL VNPay. | |
| U-16 | Thanh toán sau khi đơn đã hủy | Đơn chờ, đã mở trang VNPay ở tab A | 1) Ở tab B, hủy đơn trong "Vé của tôi"<br>2) Ở tab A, hoàn tất thanh toán bằng thẻ test | Trang kết quả báo thanh toán đến sau khi hết giữ ghế nên không xuất vé. Đơn chuyển "Chờ hoàn tiền". ADMIN và MANAGER chi nhánh nhận thông báo hoàn tiền. | |
| U-17 | Yêu cầu hoàn tiền | Đơn đã thanh toán dưới 24 giờ, chưa soát vé | 1) Mở "Vé của tôi"<br>2) Bấm yêu cầu hoàn, nhập lý do | Đơn chuyển "Chờ hoàn tiền". Quản lý chi nhánh nhận thông báo. Đơn quá 24 giờ không có nút yêu cầu hoàn. | |
| U-18 | Không hoàn vé đã soát | Đơn đã thanh toán, có vé đã check-in | 1) Mở "Vé của tôi" | Không có nút yêu cầu hoàn. Gọi `POST /api/booking/{id}/refund-request` trả lỗi không thể hoàn. | |
| U-19 | Đánh giá phim | Đăng nhập `user` | 1) Mở chi tiết phim, chấm 4 sao và bình luận<br>2) Chấm lại 5 sao | Đánh giá hiện trong danh sách. Lần thứ hai cập nhật đánh giá cũ, không tạo bản mới. Điểm trung bình đổi theo. | |
| U-20 | Hồ sơ và đổi mật khẩu | Đăng nhập `user` | 1) Mở `/profile`, sửa họ tên, ngày sinh<br>2) Đổi mật khẩu với mật khẩu hiện tại sai<br>3) Đổi với mật khẩu hiện tại đúng | Hồ sơ lưu được. Mật khẩu hiện tại sai báo lỗi tại form, không bị đăng xuất. Mật khẩu đúng đổi thành công. | |
