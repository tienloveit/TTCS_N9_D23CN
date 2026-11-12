package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ltweb.backend.config.VnpayProperties;
import com.ltweb.backend.enums.RefundGatewayStatus;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

class VnpayRefundGatewayTest {
    private final RestTemplate http = mock(RestTemplate.class);
    private final ObjectMapper json = new ObjectMapper();
    private final VnpayProperties props = properties();
    private final VnpayRefundGateway gateway = new VnpayRefundGateway(props, http, json);
    private final VnpayRefundGateway.Order order = new VnpayRefundGateway.Order(5L, "durable-request-id",
            new BigDecimal("100000"), "123456", LocalDateTime.of(2026, 11, 12, 10, 0),
            LocalDateTime.of(2026, 11, 12, 10, 30), "admin", "127.0.0.1");

    @Test
    void verifiedFullRefundAndQueryCanConfirmSuccess() throws Exception {
        respond(response(false), false);
        assertThat(gateway.refund(order).status()).isEqualTo(RefundGatewayStatus.SUCCEEDED);
        respond(response(true), true);
        assertThat(gateway.query(order).status()).isEqualTo(RefundGatewayStatus.SUCCEEDED);
    }

    @ParameterizedTest
    @CsvSource({"00,01,00,UNKNOWN", "00,02,05,UNKNOWN", "00,02,06,UNKNOWN",
            "00,02,09,FAILED", "94,02,00,UNKNOWN", "98,02,00,UNKNOWN", "99,02,00,UNKNOWN",
            "95,02,00,FAILED", "93,02,00,FAILED"})
    void responseCodeAloneIsNotRefundConfirmation(String code, String type, String state, String expected) throws Exception {
        var r = response(false);
        r.put("vnp_ResponseCode", code);
        r.put("vnp_TransactionType", type);
        r.put("vnp_TransactionStatus", state);
        respond(r, false);
        assertThat(gateway.refund(order).status()).isEqualTo(RefundGatewayStatus.valueOf(expected));
    }

    @ParameterizedTest
    @CsvSource({"vnp_TmnCode,OTHER", "vnp_TxnRef,6", "vnp_Amount,9999999",
            "vnp_Command,querydr", "vnp_ResponseId,''", "vnp_TransactionNo,''"})
    void signedButUnrelatedOrIncompleteResponseCannotCompleteRefund(String field, String value) throws Exception {
        var r = response(false);
        r.put(field, value);
        respond(r, false);
        assertThat(gateway.refund(order).status()).isEqualTo(RefundGatewayStatus.UNKNOWN);
    }

    @Test
    void invalidSignatureAndTamperedAmountAreUncertain() throws Exception {
        var r = response(false);
        respond(r, false);
        r.put("vnp_Amount", "10000001"); // Preserve the previous signature after tampering.
        raw(json.writeValueAsString(r));
        assertThat(gateway.refund(order).status()).isEqualTo(RefundGatewayStatus.UNKNOWN);
        r.put("vnp_Amount", "10000000");
        r.put("vnp_SecureHash", "0".repeat(128));
        raw(json.writeValueAsString(r));
        assertThat(gateway.refund(order).status()).isEqualTo(RefundGatewayStatus.UNKNOWN);
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "not json", "{\"vnp_ResponseCode\":\"00\"}", "null"})
    void malformedOrUnsignedResponseDoesNotChangeFinancialState(String body) {
        raw(body);
        assertThat(gateway.refund(order).status()).isEqualTo(RefundGatewayStatus.UNKNOWN);
    }

    @Test
    void timeoutIsUnknownRatherThanRetryableRejection() {
        when(http.postForEntity(eq(props.getApiUrl()), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new ResourceAccessException("read timeout"));
        assertThat(gateway.refund(order).status()).isEqualTo(RefundGatewayStatus.UNKNOWN);
    }

    @Test
    void queryingTheOriginalSuccessfulPaymentDoesNotProveRefund() throws Exception {
        var r = response(true);
        r.put("vnp_TransactionType", "01");
        respond(r, true);
        assertThat(gateway.query(order).status()).isEqualTo(RefundGatewayStatus.UNKNOWN);
    }

    private Map<String, String> response(boolean query) {
        var r = new LinkedHashMap<String, String>();
        r.put("vnp_ResponseId", "response-1");
        r.put("vnp_Command", query ? "querydr" : "refund");
        r.put("vnp_ResponseCode", "00");
        r.put("vnp_Message", "Success");
        r.put("vnp_TmnCode", "SYNTHETIC");
        r.put("vnp_TxnRef", "5");
        r.put("vnp_Amount", "10000000");
        r.put("vnp_BankCode", "NCB");
        r.put("vnp_PayDate", "20261112103000");
        r.put("vnp_TransactionNo", "987654");
        r.put("vnp_TransactionType", "02");
        r.put("vnp_TransactionStatus", "00");
        r.put("vnp_OrderInfo", "Hoan tien don 5");
        if (query) {
            r.put("vnp_PromotionCode", "");
            r.put("vnp_PromotionAmount", "");
        }
        return r;
    }

    private void respond(Map<String, String> r, boolean query) throws Exception {
        String data = String.join("|", r.get("vnp_ResponseId"), r.get("vnp_Command"), r.get("vnp_ResponseCode"),
                r.get("vnp_Message"), r.get("vnp_TmnCode"), r.get("vnp_TxnRef"), r.get("vnp_Amount"),
                r.get("vnp_BankCode"), r.get("vnp_PayDate"), r.get("vnp_TransactionNo"),
                r.get("vnp_TransactionType"), r.get("vnp_TransactionStatus"), r.get("vnp_OrderInfo"));
        if (query) data += "|" + r.get("vnp_PromotionCode") + "|" + r.get("vnp_PromotionAmount");
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(props.getSecretKey().getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        r.put("vnp_SecureHash", HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8))));
        raw(json.writeValueAsString(r));
    }

    private void raw(String body) {
        when(http.postForEntity(eq(props.getApiUrl()), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(body));
    }

    private static VnpayProperties properties() {
        var p = new VnpayProperties();
        p.setApiUrl("https://example.invalid/vnpay");
        p.setTmnCode("SYNTHETIC");
        p.setSecretKey("synthetic-refund-test-key");
        return p;
    }
}
