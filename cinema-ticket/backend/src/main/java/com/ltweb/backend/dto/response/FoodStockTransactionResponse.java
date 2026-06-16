package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.FoodStockTransactionType;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FoodStockTransactionResponse {
    private Long transactionId;
    private Long foodId;
    private String foodName;
    private Long branchId;
    private FoodStockTransactionType type;
    private Integer quantityBefore;
    private Integer quantityChange;
    private Integer quantityAfter;
    private String note;
    private Long referenceId;
    private String referenceType;
    private Long createdById;
    private String createdByUsername;
    private LocalDateTime createdAt;
}
