package com.ltweb.backend.service;

import com.ltweb.backend.entity.AuditLog;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.repository.AuditLogRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {
  private final AuditLogRepository auditLogRepository;
  private final UserRepository userRepository;

  public void record(AuditAction action, String targetType, Object targetId, String details) {
    User actor = getCurrentUserOrNull();
    auditLogRepository.save(
        AuditLog.builder()
            .actorId(actor == null ? null : actor.getId())
            .actorUsername(actor == null ? null : actor.getUsername())
            .actorRole(actor == null ? null : actor.getRole())
            .branchId(actor == null ? null : actor.getBranchId())
            .action(action)
            .targetType(targetType)
            .targetId(targetId == null ? null : String.valueOf(targetId))
            .details(details)
            .build());
  }

  @Transactional(readOnly = true)
  public List<AuditLog> getRecentLogs() {
    User actor = getCurrentUserOrNull();
    if (actor == null) {
      throw new AccessDeniedException("Authentication required");
    }
    if (actor.getRole() == UserRole.ADMIN) {
      return auditLogRepository.findTop100ByOrderByCreatedAtDesc();
    }
    if (actor.getRole() == UserRole.MANAGER && actor.getBranchId() != null) {
      return auditLogRepository.findTop100ByBranchIdOrderByCreatedAtDesc(actor.getBranchId());
    }
    throw new AccessDeniedException("Audit log access denied");
  }

  private User getCurrentUserOrNull() {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !authentication.isAuthenticated()) {
      return null;
    }
    String username = authentication.getName();
    if (username == null || "anonymousUser".equals(username)) {
      return null;
    }
    return userRepository.findByUsername(username).orElse(null);
  }
}
