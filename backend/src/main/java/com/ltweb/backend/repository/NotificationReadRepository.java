package com.ltweb.backend.repository;

import com.ltweb.backend.entity.NotificationRead;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {
  List<NotificationRead> findByUserIdAndNotificationIdIn(
      Long userId, Collection<Long> notificationIds);

  Optional<NotificationRead> findByUserIdAndNotificationId(Long userId, Long notificationId);
}
