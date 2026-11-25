package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.util.TicketQrCode;
import org.junit.jupiter.api.Test;

class TicketQrCodeTest {
  Booking booking = Booking.builder().bookingCode("BK-20261125-ABCD1234").build();

  @Test
  void newTicketGetsCodeFromBookingTicketAndSeat() {
    Ticket ticket = Ticket.builder().id(10L).seat(Seat.builder().seatCode("C7").build()).build();

    assertThat(TicketQrCode.of(booking, ticket))
        .isEqualTo("CINEMAHUB|BOOKING=BK-20261125-ABCD1234|TICKET=10|SEAT=C7");
  }

  @Test
  void issuedCodeIsKeptSoPrintedTicketsStayValid() {
    Ticket ticket =
        Ticket.builder().id(10L).qrCode("CINEMAHUB|BOOKING=OLD|TICKET=10|SEAT=A1").build();

    assertThat(TicketQrCode.of(booking, ticket))
        .isEqualTo("CINEMAHUB|BOOKING=OLD|TICKET=10|SEAT=A1");
  }

  @Test
  void missingSeatLeavesSeatPartEmpty() {
    Ticket ticket = Ticket.builder().id(11L).build();

    assertThat(TicketQrCode.of(booking, ticket)).endsWith("|TICKET=11|SEAT=");
  }
}
