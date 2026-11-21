package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Notification;
import com.ltweb.backend.enums.UserRole;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
  /**
   * Thông báo có thể thuộc về người dùng, mới nhất trước: gửi riêng cho họ, gửi không chỉ định
   * role, hoặc gửi cho role của họ (cùng chi nhánh nếu có). Là tập bao; NotificationService.canView
   * quyết định cuối cùng. Lọc ở DB để thông báo của role/chi nhánh khác không chiếm chỗ trong giới
   * hạn.
   */
  @Query(
      "select n from Notification n where n.recipientUserId = :userId"
          + " or n.recipientRole is null"
          + " or (n.recipientRole = :role and (:branchId is null or n.branchId = :branchId))"
          + " order by n.createdAt desc, n.id desc")
  List<Notification> findVisibleCandidates(
      @Param("userId") Long userId,
      @Param("role") UserRole role,
      @Param("branchId") Long branchId,
      Pageable page);
}
