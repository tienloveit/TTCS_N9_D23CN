package com.ltweb.backend.service;

import com.ltweb.backend.entity.AuditLog;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.repository.AuditLogRepository;
import com.ltweb.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

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
            .action(action)
            .targetType(targetType)
            .targetId(targetId == null ? null : String.valueOf(targetId))
            .details(details)
            .build());
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
