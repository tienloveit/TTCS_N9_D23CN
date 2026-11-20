-- V5: nhật ký giao dịch thanh toán (chỉ ghi thêm).
-- payments chỉ giữ trạng thái và lần hoàn tiền gần nhất; bảng này lưu từng callback VNPay
-- (return/IPN, kể cả sai chữ ký hoặc không khớp đơn) và từng lần gửi/truy vấn hoàn tiền cùng
-- phản hồi của cổng. Không lưu vnp_SecureHash.

CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT,
  `event_type` VARCHAR(30) NOT NULL,
  `reference` VARCHAR(100),
  `provider_txn_id` VARCHAR(100),
  `amount` DECIMAL(15, 2),
  `response_code` VARCHAR(20),
  `transaction_status` VARCHAR(20),
  `valid_signature` BIT(1),
  `outcome` VARCHAR(50),
  `message` VARCHAR(500),
  `created_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payment_events_booking` (`booking_id`, `created_at`),
  KEY `idx_payment_events_created_at` (`created_at`),
  CONSTRAINT `chk_payment_events_type` CHECK (`event_type` IN
    ('VNPAY_RETURN', 'VNPAY_IPN', 'REFUND_SUBMIT', 'REFUND_QUERY')),
  -- Nhật ký phải sống lâu hơn thao tác xóa nhầm: không cho xóa đơn đã có giao dịch.
  CONSTRAINT `fk_payment_events_booking`
    FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
