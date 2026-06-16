package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public class QueryRequest {
    @NotBlank
    private String orderId;
    @NotBlank
    private String transDate;

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getTransDate() {
        return transDate;
    }

    public void setTransDate(String transDate) {
        this.transDate = transDate;
    }
}
