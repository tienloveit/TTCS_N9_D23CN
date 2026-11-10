package com.ltweb.backend.dto.request;

import com.ltweb.backend.enums.FoodStockTransactionType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FoodStockAdjustmentRequest {
    @NotNull
    private FoodStockTransactionType type;

    @NotNull
    @Min(0)
    private Integer quantityChange;

    @Min(0)
    private Integer expectedQuantity;

    @NotBlank(message = "Stock transaction reason is required")
    @Size(max = 500)
    private String note;
}
