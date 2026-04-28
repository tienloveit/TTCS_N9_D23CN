package com.ltweb.backend.controller;

import com.ltweb.backend.dto.request.CreateVnpayRequest;
import com.ltweb.backend.dto.request.QueryRequest;
import com.ltweb.backend.dto.request.RefundRequest;
import com.ltweb.backend.dto.response.ApiResponse;
import com.ltweb.backend.service.VnpayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/vnpay")
public class VnpayController {

  private final VnpayService vnpayService;

  public VnpayController(VnpayService vnpayService) {
    this.vnpayService = vnpayService;
  }

  @PostMapping("/payment-url")
  public ApiResponse<Map<String, Object>> createPayment(
      @Valid @RequestBody CreateVnpayRequest request, HttpServletRequest servletRequest) {
    Map<String, Object> data = vnpayService.createPaymentUrl(request, servletRequest);
    return new ApiResponse<>(200, "success", data);
  }

  @PostMapping("/querydr")
  public ApiResponse<String> querydr(
      @Valid @RequestBody QueryRequest request, HttpServletRequest servletRequest) {
    String data = vnpayService.queryDr(request, servletRequest);
    return new ApiResponse<>(200, "success", data);
  }

  @PostMapping("/refund")
  public ApiResponse<String> refund(
      @Valid @RequestBody RefundRequest request, HttpServletRequest servletRequest) {
    String data = vnpayService.refund(request, servletRequest);
    return new ApiResponse<>(200, "success", data);
  }

  @GetMapping("/return")
  public ApiResponse<Map<String, Object>> paymentReturn(@RequestParam Map<String, String> params) {
    return vnpayService.processReturnUrl(params);
  }

  @GetMapping("/ipn")
  public Map<String, String> ipn(@RequestParam Map<String, String> params) {
    return vnpayService.processIpn(params);
  }
}
