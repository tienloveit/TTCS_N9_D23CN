package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FoodStockAdjustmentRequest {
    @NotNull
    private Integer quantityChange;

    private Boolean setAbsoluteQuantity;

    @Size(max = 500)
    private String note;
}
