package com.ltweb.backend.service;

import com.ltweb.backend.event.BookingPaidEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Service
@RequiredArgsConstructor
public class MembershipUpdateListener {

    private final BookingService bookingService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateMembership(BookingPaidEvent event) {
        try {
            bookingService.updateMembershipAfterPayment(event.bookingId());
        } catch (Exception ex) {
            log.error(
                    "Could not update membership for booking {}: {}",
                    event.bookingId(),
                    ex.getMessage(),
                    ex);
        }
    }
}
