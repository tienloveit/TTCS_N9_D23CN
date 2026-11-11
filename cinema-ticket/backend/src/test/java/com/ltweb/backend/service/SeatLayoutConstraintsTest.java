package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import com.ltweb.backend.dto.request.UpdateSeatLayoutRequest;
import com.ltweb.backend.dto.request.CreateSeatRequest;
import com.ltweb.backend.entity.*;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.mapper.SeatMapperImpl;
import com.ltweb.backend.repository.*;
import jakarta.validation.Validation;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SeatLayoutConstraintsTest {
    @Mock SeatRepository seatRepository;
    @Mock RoomRepository roomRepository;
    @Mock UserRepository userRepository;
    @Spy SeatMapperImpl seatMapper = new SeatMapperImpl();
    @InjectMocks SeatService service;
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    void admin() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin", null));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(User.builder().role(UserRole.ADMIN).build()));
    }
    Seat seat(long id, int number) {
        return Seat.builder().id(id).seatCode("A"+number).rowLabel("A").seatNumber(number).build();
    }
    UpdateSeatLayoutRequest request(long[] ids, int[] numbers) {
        var request = new UpdateSeatLayoutRequest();
        var items = new java.util.ArrayList<UpdateSeatLayoutRequest.Item>();
        for (int i=0;i<ids.length;i++) {
            var item = new UpdateSeatLayoutRequest.Item();
            item.setSeatId(ids[i]); item.setRowLabel("A"); item.setSeatNumber(numbers[i]); items.add(item);
        }
        request.setSeats(items); return request;
    }
    @Test void swapsReleaseUniquePositionsAndPreserveUntouchedSeats() {
        admin();
        var a=seat(1,1); var b=seat(2,2); var c=seat(3,3);
        when(seatRepository.findByRoomId(9L)).thenReturn(List.of(a,b,c));
        doAnswer(invocation -> {
            assertThat(a.getRowLabel()).isNull(); assertThat(b.getRowLabel()).isNull();
            assertThat(c.getSeatCode()).isEqualTo("A3"); return null;
        }).when(seatRepository).flush();
        when(seatRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        service.updateSeatLayout(9L,request(new long[]{1,2},new int[]{2,1}));
        assertThat(a.getSeatCode()).isEqualTo("A2"); assertThat(b.getSeatCode()).isEqualTo("A1");
        assertThat(c.getRowLabel()).isEqualTo("A"); assertThat(c.getSeatCode()).isEqualTo("A3");
    }
    @Test void rejectsPartialLayoutCollisionBeforeAnyWrite() {
        admin(); when(seatRepository.findByRoomId(9L)).thenReturn(List.of(seat(1,1),seat(2,2)));
        assertThatThrownBy(() -> service.updateSeatLayout(9L,request(new long[]{1},new int[]{2}))).isInstanceOf(AppException.class);
        verify(seatRepository,never()).saveAll(any());
    }
    @Test void rejectsRepeatedSeatIdsBeforeAnyWrite() {
        admin(); when(seatRepository.findByRoomId(9L)).thenReturn(List.of(seat(1,1)));
        assertThatThrownBy(() -> service.updateSeatLayout(9L,request(new long[]{1,1},new int[]{1,2}))).isInstanceOf(AppException.class);
        verify(seatRepository,never()).saveAll(any());
    }
    @Test void defaultsSeatTypeAndRejectsBlankSeatCode() {
        var request=new CreateSeatRequest(); request.setSeatCode("A1");
        var seat=seatMapper.toSeat(request);
        ReflectionTestUtils.invokeMethod(seat,"initializeSeatType");
        assertThat(seat.getSeatType()).isEqualTo(SeatType.STANDARD);
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            request.setSeatCode(" ");
            assertThat(factory.getValidator().validateProperty(request,"seatCode")).isNotEmpty();
        }
    }
}
