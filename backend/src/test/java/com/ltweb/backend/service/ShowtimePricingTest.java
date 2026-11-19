package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.CreateShowtimeRequest;
import com.ltweb.backend.dto.request.UpdateShowtimeRequest;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.ShowtimeMapper;
import com.ltweb.backend.repository.*;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.core.context.SecurityContextHolder;

class ShowtimePricingTest {
  TicketRepository tickets = mock(TicketRepository.class);
  ShowtimeRepository showtimes = mock(ShowtimeRepository.class);
  ShowtimeMapper mapper = new com.ltweb.backend.mapper.ShowtimeMapperImpl();

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void allSeatTypesUseShowtimePriceWhenInventoryIsCreated() {
    SeatRepository seats = mock(SeatRepository.class);
    var service =
        BackendServiceFixtures.ticket(
            tickets,
            mock(com.ltweb.backend.repository.BookingRepository.class),
            mock(com.ltweb.backend.repository.ShowtimeRepository.class),
            seats,
            mock(com.ltweb.backend.repository.UserRepository.class),
            mock(org.springframework.data.redis.core.StringRedisTemplate.class),
            mock(com.ltweb.backend.mapper.TicketMapper.class),
            mock(QRCodeReaderService.class),
            mock(AuditLogService.class));
    Showtime showtime = showtime();
    when(seats.findByRoomId(2L))
        .thenReturn(
            List.of(
                Seat.builder().id(1L).seatType(SeatType.STANDARD).build(),
                Seat.builder().id(2L).seatType(SeatType.VIP).build(),
                Seat.builder().id(3L).seatType(SeatType.COUPLE).build()));
    service.createTicket(showtime);
    verify(tickets)
        .saveAll(
            argThat(
                inventory -> {
                  var result = new java.util.ArrayList<Ticket>();
                  inventory.forEach(result::add);
                  assertThat(result)
                      .hasSize(3)
                      .allSatisfy(
                          ticket -> {
                            assertThat(ticket.getPrice()).isEqualByComparingTo("95000");
                            assertThat(ticket.getTicketStatus()).isEqualTo(TicketStatus.AVAILABLE);
                          });
                  return true;
                }));
  }

  @Test
  void changingPriceUpdatesUnsoldInventoryAndResponseTogether() {
    Showtime showtime = showtime();
    var inventory =
        List.of(
            Ticket.builder()
                .ticketStatus(TicketStatus.AVAILABLE)
                .price(showtime.getTicketPrice())
                .build());
    when(showtimes.findById(3L)).thenReturn(Optional.of(showtime));
    when(showtimes.save(showtime)).thenReturn(showtime);
    when(tickets.findByShowtimeIdForUpdate(3L)).thenReturn(inventory);
    var response =
        service()
            .update(
                3L, UpdateShowtimeRequest.builder().ticketPrice(new BigDecimal("110000")).build());
    assertThat(response.getTicketPrice()).isEqualByComparingTo("110000");
    assertThat(inventory.getFirst().getPrice()).isEqualByComparingTo("110000");
  }

  @ParameterizedTest
  @EnumSource(
      value = TicketStatus.class,
      names = {"HOLDING", "BOOKED"})
  void reservedOrSoldTicketsPreventPriceChanges(TicketStatus status) {
    Showtime showtime = showtime();
    Ticket ticket = Ticket.builder().ticketStatus(status).price(new BigDecimal("95000")).build();
    when(showtimes.findById(3L)).thenReturn(Optional.of(showtime));
    when(tickets.findByShowtimeIdForUpdate(3L)).thenReturn(List.of(ticket));
    assertThatThrownBy(
            () ->
                service()
                    .update(
                        3L,
                        UpdateShowtimeRequest.builder()
                            .ticketPrice(new BigDecimal("110000"))
                            .build()))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.SHOWTIME_PRICE_LOCKED);
    assertThat(ticket.getPrice()).isEqualByComparingTo("95000");
    assertThat(showtime.getTicketPrice()).isEqualByComparingTo("95000");
    verify(showtimes, never()).save(any());
  }

  @Test
  void statusOnlyUpdatePreservesPriceWithoutRepricingTickets() {
    Showtime showtime = showtime();
    when(showtimes.findById(3L)).thenReturn(Optional.of(showtime));
    when(showtimes.save(showtime)).thenReturn(showtime);
    var response =
        service().update(3L, UpdateShowtimeRequest.builder().status(ShowtimeStatus.CLOSED).build());
    assertThat(response.getTicketPrice()).isEqualByComparingTo("95000");
    verify(tickets, never()).findByShowtimeIdForUpdate(any());
  }

  @Test
  void createRequiresPositiveWholeVndPriceAndUpdateValidatesWhenPresent() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      var create = CreateShowtimeRequest.builder().build();
      assertThat(validator.validate(create))
          .anyMatch(v -> v.getPropertyPath().toString().equals("ticketPrice"));
      for (String invalid : List.of("0", "-1", "1.5", "1000000000000")) {
        var update = UpdateShowtimeRequest.builder().ticketPrice(new BigDecimal(invalid)).build();
        assertThat(validator.validate(update)).isNotEmpty();
      }
      assertThat(
              validator.validate(
                  UpdateShowtimeRequest.builder().ticketPrice(new BigDecimal("95000")).build()))
          .isEmpty();
    }
  }

  private Showtime showtime() {
    return Showtime.builder()
        .id(3L)
        .room(Room.builder().id(2L).status(RoomStatus.ACTIVE).build())
        .status(ShowtimeStatus.OPEN)
        .ticketPrice(new BigDecimal("95000"))
        .build();
  }

  private ShowtimeService service() {
    return new ShowtimeService(
        BackendServiceFixtures.CLOCK,
        showtimes,
        mock(RoomRepository.class),
        mock(MovieRepository.class),
        mock(BookingRepository.class),
        tickets,
        mock(UserRepository.class),
        mapper,
        mock(TicketService.class));
  }
}
