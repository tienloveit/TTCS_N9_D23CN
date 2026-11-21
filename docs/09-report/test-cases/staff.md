# Ca kiểm thử: Nhân viên quầy (STAFF)

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- Người kiểm thử:
- Ngày chạy:
- Commit đã thử:

Tài khoản `staff` thuộc chi nhánh `CN-HCM-01`. Ca S-14 cần thêm một đơn của chi nhánh khác.

| Mã | Chức năng | Tiền điều kiện | Bước thực hiện | Kết quả mong đợi | Kết quả thực tế |
| --- | --- | --- | --- | --- | --- |
| S-01 | Trang mặc định | — | 1) Đăng nhập `staff` | Vào `/staff/dashboard`. Menu có Tổng quan, Bán vé, Soát vé, Đơn hàng, Thông báo. | |
| S-02 | Bán vé tiền mặt cho khách mới | Suất hôm nay ở `CN-HCM-01` | 1) Mở `/staff/booking`, chọn suất<br>2) Chọn 2 ghế, thêm bắp nước<br>3) Nhập SĐT chưa có trong hệ thống, chọn tiền mặt, nhập tiền khách đưa<br>4) Thu tiền, in phiếu | Hiện tiền thừa đúng. Đơn hoàn tất ngay, vé có QR, phiếu in được. Hệ thống tạo tài khoản khách vãng lai `guest_<sđt>`. Ghế hiện đã bán ở trang khách. | |
| S-03 | Bán cho khách đã có tài khoản | SĐT của tài khoản `user` | 1) Nhập SĐT của `user`, rời ô nhập<br>2) Bấm "Đúng khách này"<br>3) Thu tiền mặt | Hiện tên và hạng đã che bớt. Đơn gắn vào tài khoản `user`, hiện trong "Vé của tôi" của `user`, tổng chi tiêu `user` tăng. | |
| S-04 | Không xác nhận khách trùng | SĐT của tài khoản `user` | 1) Nhập SĐT của `user`, không bấm xác nhận<br>2) Đổi SĐT rồi đổi lại<br>3) Thử thu tiền | Không tạo được đơn khi chưa xác nhận đúng khách. Đổi SĐT xóa xác nhận cũ. | |
| S-05 | SĐT và email của hai người khác nhau | SĐT của `user`, email của `user2` | 1) Nhập cả hai, thử thu tiền | Báo SĐT và email thuộc hai tài khoản khác nhau (409), không tạo đơn. | |
| S-06 | Bán vé qua VNPay tại quầy | Suất còn bán | 1) Chọn ghế, chọn VNPay<br>2) Bấm mở cổng ở tab mới, trả bằng thẻ test | Màn quầy hiện QR và đếm ngược. Trong vài giây sau khi trả, màn quầy chuyển sang "đã xuất vé". | |
| S-07 | Hủy giao dịch VNPay | Đang ở bước VNPay của S-06 | 1) Bấm "Hủy giao dịch"<br>2) Đổi sang tiền mặt, thu tiền | Đơn VNPay bị hủy, ghế được trả. Thông tin đang soạn giữ nguyên, bán bằng tiền mặt thành công. | |
| S-08 | Ghế đang chọn bị khách online đặt | Một trình duyệt khách mở cùng suất | 1) Nhân viên chọn ghế B3 nhưng chưa thu tiền<br>2) Khách đặt ghế B3 | Màn quầy bỏ B3 khỏi đơn đang soạn và hiện cảnh báo. Tổng tiền đổi theo. | |
| S-09 | Bán sau giờ chiếu | Một suất đã bắt đầu 10 phút, một suất đã bắt đầu 20 phút | 1) Tìm hai suất ở màn bán vé | Suất bắt đầu 10 phút vẫn bán được. Suất bắt đầu quá 15 phút không bán được. | |
| S-10 | Soát vé bằng QR | Đơn đã thanh toán, suất bắt đầu trong vòng 60 phút | 1) Mở `/staff/check-in`<br>2) Quét QR bằng camera, hoặc tải ảnh QR | Báo hợp lệ, hiện phim, phòng, ghế. Lịch sử phiên có lượt soát. Chi tiết vé ghi người soát và thời điểm. | |
| S-11 | Soát lại vé đã soát | Vé từ S-10 | 1) Quét lại cùng vé | Báo vé đã soát trước đó, giữ thời điểm và người soát lần đầu. | |
| S-12 | Soát quá sớm | Đơn của suất còn hơn 60 phút nữa mới chiếu | 1) Nhập mã đơn `BK-...` | Báo chưa tới giờ soát vé. | |
| S-13 | Không soát bằng số vé | — | 1) Nhập số ID vé (chỉ gồm chữ số) | Báo không soát bằng số vé, yêu cầu quét QR hoặc nhập mã đơn. | |
| S-14 | Soát vé của chi nhánh khác | Một đơn đã thanh toán ở `CN-HN-01` | 1) Nhập mã đơn đó | Báo vé không thuộc chi nhánh này (403). | |
| S-15 | Gửi hoàn thay khách | Đơn bán tại quầy ở S-02, chưa soát, trong 24 giờ | 1) Mở `/staff/bookings`, mở đơn<br>2) Bấm "Yêu cầu hoàn thay khách", để trống lý do<br>3) Nhập lý do, gửi lại | Lần đầu bị từ chối vì thiếu lý do. Lần sau đơn chuyển "Chờ hoàn tiền". Nhật ký có `REFUND_REQUESTED`. | |
| S-16 | Đối soát két | Đã làm S-02. Quản lý đã duyệt hoàn một đơn tiền mặt của `staff` trong ngày (M-10) | 1) Mở `/staff/dashboard`<br>2) Nhập tiền lẻ đầu ca và tiền đếm được | Tiền thu bằng tổng đơn tiền mặt đã bán hôm nay. Tiền hoàn bằng tổng đơn tiền mặt được hoàn hôm nay. Phải có = thu − hoàn. Tiền nhập lưu lại khi tải lại trang trong ngày. | |
| S-17 | Chặn khu quản lý | Đăng nhập `staff` | 1) Gõ `/manager` và `/admin`<br>2) Gọi `GET /api/admin/reports/revenue` | Bị chuyển về trang của nhân viên hoặc trang chủ. API trả 403. | |
