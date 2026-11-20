package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Promotion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
  Optional<Promotion> findByCodeIgnoreCase(String code);

  boolean existsByCodeIgnoreCase(String code);

  List<Promotion> findAllByActiveTrue();

  /**
   * Giữ một lượt dùng bằng một câu UPDATE có điều kiện, nên nhiều đơn đồng thời không thể vượt
   * usageLimit. Trả 0 khi mã không tồn tại hoặc đã hết lượt.
   */
  @Modifying(flushAutomatically = true)
  @Query(
      "update Promotion p set p.usedCount = coalesce(p.usedCount, 0) + 1"
          + " where upper(p.code) = upper(:code)"
          + " and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)")
  int reserveUsage(@Param("code") String code);

  /** Trả lại một lượt đã giữ; không bao giờ làm usedCount âm. */
  @Modifying(flushAutomatically = true)
  @Query(
      "update Promotion p set p.usedCount = p.usedCount - 1"
          + " where upper(p.code) = upper(:code) and p.usedCount > 0")
  int releaseUsage(@Param("code") String code);

  /** Tăng lượt không điều kiện (đơn cũ chưa giữ lượt đã thanh toán xong). */
  @Modifying(flushAutomatically = true)
  @Query(
      "update Promotion p set p.usedCount = coalesce(p.usedCount, 0) + 1"
          + " where upper(p.code) = upper(:code)")
  int incrementUsage(@Param("code") String code);
}
