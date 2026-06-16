package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.AuditAction;
import com.ltweb.backend.enums.UserRole;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuditLogResponse {
    private Long id;
    private Long actorId;
    private String actorUsername;
    private UserRole actorRole;
    private Long branchId;
    private AuditAction action;
    private String targetType;
    private String targetId;
    private String details;
    private LocalDateTime createdAt;
}
