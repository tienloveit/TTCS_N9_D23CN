package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop100ByOrderByCreatedAtDesc();

}
