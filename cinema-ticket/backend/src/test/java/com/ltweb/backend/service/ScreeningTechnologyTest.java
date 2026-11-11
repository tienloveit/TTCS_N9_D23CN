package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ltweb.backend.dto.request.*;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.mapper.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class ScreeningTechnologyTest {
    @Test void formatAndTechnologyAreIndependentAndReturnedTogether() {
        var mapper = new ShowtimeMapperImpl();
        var showtime = mapper.toShowtime(CreateShowtimeRequest.builder().screeningFormat(ScreeningFormat.THREE_D).build());
        showtime.setRoom(Room.builder().roomTechnology(RoomTechnology.IMAX).build());
        var response = mapper.toResponse(showtime);
        assertThat(response.getScreeningFormat()).isEqualTo(ScreeningFormat.THREE_D);
        assertThat(response.getRoomTechnology()).isEqualTo("IMAX");
        mapper.updateShowtime(showtime, UpdateShowtimeRequest.builder().screeningFormat(ScreeningFormat.TWO_D).build());
        assertThat(showtime.getScreeningFormat()).isEqualTo(ScreeningFormat.TWO_D);
        assertThat(showtime.getRoom().getRoomTechnology()).isEqualTo(RoomTechnology.IMAX);
    }
    @Test void omittedValuesGetDefaultsAndPartialUpdatesPreserveThem() {
        var room = new RoomMapperImpl().toRoomEntity(CreateRoomRequest.builder().build());
        var mapper = new ShowtimeMapperImpl();
        var showtime = mapper.toShowtime(CreateShowtimeRequest.builder().build());
        ReflectionTestUtils.invokeMethod(room, "initializeStatus");
        ReflectionTestUtils.invokeMethod(showtime, "initializeScreeningFormat");
        assertThat(room.getRoomTechnology()).isEqualTo(RoomTechnology.STANDARD);
        assertThat(showtime.getScreeningFormat()).isEqualTo(ScreeningFormat.TWO_D);
        showtime.setScreeningFormat(ScreeningFormat.THREE_D);
        mapper.updateShowtime(showtime, UpdateShowtimeRequest.builder().status(ShowtimeStatus.CLOSED).build());
        assertThat(showtime.getScreeningFormat()).isEqualTo(ScreeningFormat.THREE_D);
    }
    @Test void apiAcceptsNewTechnologiesAndRejectsMixedConcepts() throws Exception {
        var json = new ObjectMapper();
        for (var technology : RoomTechnology.values()) {
            var room = json.readValue("{\"roomTechnology\":\""+technology+"\"}", CreateRoomRequest.class);
            assertThat(room.getRoomTechnology()).isEqualTo(technology);
        }
        assertThatThrownBy(() -> json.readValue("{\"roomTechnology\":\"THREE_D\"}", CreateRoomRequest.class)).isInstanceOf(Exception.class);
        assertThatThrownBy(() -> json.readValue("{\"screeningFormat\":\"IMAX\"}", CreateShowtimeRequest.class)).isInstanceOf(Exception.class);
    }
}
