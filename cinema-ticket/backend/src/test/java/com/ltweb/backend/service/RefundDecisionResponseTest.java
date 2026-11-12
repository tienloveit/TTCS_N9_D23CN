package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.ltweb.backend.controller.BookingController;
import com.ltweb.backend.dto.request.ProcessRefundRequest;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.enums.BookingStatus;
import java.util.Map;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class RefundDecisionResponseTest {
    @ParameterizedTest
    @EnumSource(value = BookingStatus.class, names = {"REFUND_REQUESTED", "REFUNDED"})
    void bothApprovalRoutesDescribeActualState(BookingStatus state) {
        var service = mock(BookingService.class);
        var controller = new BookingController(service);
        var result = BookingResponse.builder().status(state).build();
        when(service.processRefund(5L, true, null)).thenReturn(result);
        var request = new ProcessRefundRequest();
        request.setApproved(true);
        String expected = state == BookingStatus.REFUNDED
                ? "Refund confirmed!" : "Refund is awaiting gateway confirmation.";
        assertThat(controller.processRefund(5L, Map.of("approved", true)).getMessage()).isEqualTo(expected);
        assertThat(controller.decideRefund(5L, request).getMessage()).isEqualTo(expected);
    }
}
