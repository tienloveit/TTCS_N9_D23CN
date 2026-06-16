package com.ltweb.backend.dto.response;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemSettingResponse {
    private Long id;
    private String settingKey;
    private String settingValue;
    private String description;
    private LocalDateTime updatedAt;
}
