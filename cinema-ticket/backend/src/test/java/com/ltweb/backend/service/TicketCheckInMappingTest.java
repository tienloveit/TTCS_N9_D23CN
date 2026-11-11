package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import com.ltweb.backend.entity.Ticket;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.mapper.TicketMapperImpl;
import org.junit.jupiter.api.Test;

class TicketCheckInMappingTest {
    @Test void ticketResponseIncludesStaffIdentityAndSupportsUnknownHistoricalActor() {
        var mapper = new TicketMapperImpl();
        var ticket = Ticket.builder().checkedInBy(User.builder().id(7L).fullName("Staff name").build()).build();
        var response = mapper.toTicketResponse(ticket);
        assertThat(response.getCheckedInBy()).isEqualTo(7L);
        assertThat(response.getCheckedInByName()).isEqualTo("Staff name");
        ticket.setCheckedInBy(null);
        assertThat(mapper.toTicketResponse(ticket).getCheckedInBy()).isNull();
    }
}
