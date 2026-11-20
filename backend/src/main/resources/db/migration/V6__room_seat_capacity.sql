-- V6: seat_capacity là số ghế thật của phòng. Trước đây thêm/xóa ghế lẻ không cập nhật giá trị này
-- nên báo cáo tỷ lệ lấp đầy lệch. Từ nay SeatService đồng bộ sau mỗi thay đổi; migration này tính
-- lại một lần cho dữ liệu hiện có (phòng chưa có ghế giữ nguyên giá trị đã nhập).
UPDATE rooms r
SET seat_capacity = (SELECT COUNT(*) FROM seats s WHERE s.room_id = r.id)
WHERE EXISTS (SELECT 1 FROM seats s WHERE s.room_id = r.id);

ALTER TABLE rooms
  ADD CONSTRAINT chk_rooms_seat_capacity CHECK (seat_capacity IS NULL OR seat_capacity >= 0);
