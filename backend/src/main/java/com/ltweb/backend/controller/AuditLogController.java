package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.dto.response.AuditLogResponse;
import com.ltweb.backend.entity.AuditLog;
import com.ltweb.backend.service.AuditLogService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {
  private final AuditLogService auditLogService;

  @GetMapping
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public ApiResponse<List<AuditLogResponse>> getRecentLogs() {
    ApiResponse<List<AuditLogResponse>> apiResponse = new ApiResponse<>();
    apiResponse.setResult(auditLogService.getRecentLogs().stream().map(this::toResponse).toList());
    return apiResponse;
  }

  private AuditLogResponse toResponse(AuditLog log) {
    return AuditLogResponse.builder()
        .id(log.getId())
        .actorId(log.getActorId())
        .actorUsername(log.getActorUsername())
        .actorRole(log.getActorRole())
        .branchId(log.getBranchId())
        .action(log.getAction())
        .targetType(log.getTargetType())
        .targetId(log.getTargetId())
        .details(log.getDetails())
        .createdAt(log.getCreatedAt())
        .build();
  }
}
