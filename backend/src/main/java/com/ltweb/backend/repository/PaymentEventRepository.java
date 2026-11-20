package com.ltweb.backend.repository;

import com.ltweb.backend.entity.PaymentEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, Long> {
  List<PaymentEvent> findByBookingIdOrderByCreatedAtAscIdAsc(Long bookingId);
}
