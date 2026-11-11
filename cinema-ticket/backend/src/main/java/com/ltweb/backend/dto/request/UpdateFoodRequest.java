package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateFoodRequest {
    private String name;

    private String description;

    @DecimalMin(value = "0.0", inclusive = false, message = "Food price must be greater than 0")
    private BigDecimal price;

    private String imageUrl;

    private Long branchId;

    /** null = giữ nguyên số lượng tồn hiện tại. */
    @Min(value = 0, message = "Stock quantity must not be negative")
    private Integer stockQuantity;

    /** true = chuyển món về trạng thái không giới hạn tồn kho. */
    private Boolean unlimitedStock;

    @Min(value = 0, message = "Low stock threshold must not be negative")
    private Integer lowStockThreshold;

    private Boolean active;
}
