package com.ltweb.backend.repository;

import com.ltweb.backend.entity.AuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
  List<AuditLog> findTop100ByOrderByCreatedAtDesc();

  List<AuditLog> findTop100ByBranchIdOrderByCreatedAtDesc(Long branchId);
}
