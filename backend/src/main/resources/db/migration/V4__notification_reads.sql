-- V4: trạng thái đã đọc theo từng người dùng.
-- Trước đây notifications.read_at nằm trên chính thông báo: một nhân viên đọc là cả role/chi nhánh
-- thấy đã đọc. Nay mỗi lần đọc là một dòng (notification_id, user_id).

CREATE TABLE IF NOT EXISTS `notification_reads` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `notification_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `read_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notification_reads_notification_user` (`notification_id`, `user_id`),
  KEY `idx_notification_reads_user` (`user_id`, `notification_id`),
  CONSTRAINT `fk_notification_reads_notification`
    FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_reads_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Giữ nguyên những gì người dùng đang thấy: thông báo đã có read_at được coi là đã đọc với mọi
-- người nhận hợp lệ hiện tại (người nhận trực tiếp, hoặc đúng role và chi nhánh như
-- NotificationService.canView; ADMIN thấy thông báo không gắn chi nhánh).
INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at)
SELECT n.id, u.id, n.read_at
FROM notifications n
JOIN users u
  ON u.id = n.recipient_user_id
  OR (n.recipient_user_id IS NULL
      AND (n.recipient_role IS NULL OR n.recipient_role = u.role)
      AND (u.role = 'ADMIN' OR (n.branch_id IS NOT NULL AND n.branch_id = u.branch_id)))
WHERE n.read_at IS NOT NULL;

ALTER TABLE notifications DROP COLUMN read_at;
