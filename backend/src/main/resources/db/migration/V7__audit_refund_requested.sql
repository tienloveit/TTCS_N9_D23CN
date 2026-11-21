-- V7: nhân viên tại quầy được gửi yêu cầu hoàn tiền thay khách cho đơn bán tại quầy
-- (khách vãng lai không có tài khoản đăng nhập). Ghi nhật ký REFUND_REQUESTED để biết ai đã gửi.
-- Cột action là ENUM của MySQL: thêm giá trị mới, giữ nguyên thứ tự các giá trị cũ.
ALTER TABLE audit_logs
  MODIFY `action` ENUM(
    'STAFF_BOOKING_CREATED', 'TICKET_CHECKED_IN', 'REFUND_APPROVED', 'REFUND_REJECTED',
    'FOOD_CREATED', 'FOOD_UPDATED', 'FOOD_DISABLED', 'SYSTEM_SETTING_UPDATED',
    'REFUND_REQUESTED') NOT NULL;
