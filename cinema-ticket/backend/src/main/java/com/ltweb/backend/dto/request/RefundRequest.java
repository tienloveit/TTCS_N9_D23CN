package com.ltweb.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class RefundRequest {
  @NotBlank private String trantype;
  @NotBlank private String orderId;

  @NotNull
  @Min(1)
  private Long amount;

  @NotBlank private String transDate;
  @NotBlank private String user;

  public String getTrantype() {
    return trantype;
  }

  public void setTrantype(String trantype) {
    this.trantype = trantype;
  }

  public String getOrderId() {
    return orderId;
  }

  public void setOrderId(String orderId) {
    this.orderId = orderId;
  }

  public Long getAmount() {
    return amount;
  }

  public void setAmount(Long amount) {
    this.amount = amount;
  }

  public String getTransDate() {
    return transDate;
  }

  public void setTransDate(String transDate) {
    this.transDate = transDate;
  }

  public String getUser() {
    return user;
  }

  public void setUser(String user) {
    this.user = user;
  }
}
