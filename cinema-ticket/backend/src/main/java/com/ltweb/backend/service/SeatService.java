package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateSeatRequest;
import com.ltweb.backend.dto.request.UpdateSeatLayoutRequest;
import com.ltweb.backend.dto.request.UpdateSeatRequest;
import com.ltweb.backend.dto.response.SeatResponse;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.SeatMapper;
import com.ltweb.backend.repository.RoomRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SeatService {

  private final SeatRepository seatRepository;
  private final RoomRepository roomRepository;
  private final UserRepository userRepository;
  private final SeatMapper seatMapper;

  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public SeatResponse createSeat(CreateSeatRequest request) {
    requireRoomAccess(request.getRoomId());

    if (seatRepository.existsByRoomIdAndSeatCode(request.getRoomId(), request.getSeatCode())) {
      throw new AppException(ErrorCode.SEAT_DUPLICATE);
    }

    Seat seat = seatMapper.toSeat(request);

    Room room = getRoom(request.getRoomId());
    seat.setRoom(room);

    return seatMapper.toSeatResponse(seatRepository.save(seat));
  }

  @Transactional
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public SeatResponse updateSeat(Long seatId, UpdateSeatRequest request) {

    Seat seat = getSeat(seatId);
    requireRoomAccess(seat.getRoom().getId());

    seatMapper.updateSeat(seat, request);

    if (request.getRoomId() != null) {
      requireRoomAccess(request.getRoomId());
      Room room = getRoom(request.getRoomId());
      seat.setRoom(room);
    }

    return seatMapper.toSeatResponse(seatRepository.save(seat));
  }

  @Transactional
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public void deleteSeat(Long seatId) {
    Seat seat = getSeat(seatId);
    requireRoomAccess(seat.getRoom().getId());
    seatRepository.delete(seat);
  }

  @Transactional
  @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
  public List<SeatResponse> updateSeatLayout(Long roomId, UpdateSeatLayoutRequest request) {
    requireRoomAccess(roomId);
    if (request.getSeats() == null || request.getSeats().isEmpty()) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }

    List<Seat> roomSeats = seatRepository.findByRoomId(roomId);
    Map<Long, Seat> seatsById =
        roomSeats.stream().collect(Collectors.toMap(Seat::getId, Function.identity()));
    Set<String> positions = new HashSet<>();

    for (UpdateSeatLayoutRequest.Item item : request.getSeats()) {
      Seat seat = seatsById.get(item.getSeatId());
      if (seat == null
          || item.getRowLabel() == null
          || item.getRowLabel().isBlank()
          || item.getSeatNumber() == null
          || item.getSeatNumber() <= 0) {
        throw new AppException(ErrorCode.VALIDATION_ERROR);
      }
      String rowLabel = item.getRowLabel().trim().toUpperCase();
      String positionKey = rowLabel + ":" + item.getSeatNumber();
      if (!positions.add(positionKey)) {
        throw new AppException(ErrorCode.SEAT_DUPLICATE);
      }
    }

    for (Seat seat : roomSeats) {
      seat.setSeatCode("__TMP_" + seat.getId());
    }
    seatRepository.saveAll(roomSeats);
    seatRepository.flush();

    for (UpdateSeatLayoutRequest.Item item : request.getSeats()) {
      Seat seat = seatsById.get(item.getSeatId());
      String rowLabel = item.getRowLabel().trim().toUpperCase();
      seat.setRowLabel(rowLabel);
      seat.setSeatNumber(item.getSeatNumber());
      seat.setSeatCode(rowLabel + item.getSeatNumber());
      if (item.getSeatType() != null) {
        seat.setSeatType(item.getSeatType());
      }
      if (item.getIsActive() != null) {
        seat.setIsActive(item.getIsActive());
      }
    }

    return seatRepository.saveAll(roomSeats).stream()
        .map(seatMapper::toSeatResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<SeatResponse> getSeatsByRoom(Long roomId) {
    return seatRepository.findByRoomId(roomId).stream().map(seatMapper::toSeatResponse).toList();
  }

  public SeatResponse getSeatById(Long seatId) {
    Seat seat = getSeat(seatId);
    return seatMapper.toSeatResponse(seat);
  }

  // ===== PRIVATE HELPER =====
  private Seat getSeat(Long seatId) {
    return seatRepository
        .findById(seatId)
        .orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_FOUND));
  }

  private Room getRoom(Long roomId) {
    return roomRepository
        .findById(roomId)
        .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
  }

  private void requireRoomAccess(Long roomId) {
    User currentUser = getCurrentUser();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return;
    }
    Room room = getRoom(roomId);
    if (currentUser.getRole() == UserRole.MANAGER
        && currentUser.getBranchId() != null
        && room.getBranch() != null
        && Objects.equals(room.getBranch().getBranchId(), currentUser.getBranchId())) {
      return;
    }
    throw new AppException(ErrorCode.UNAUTHORIZED);
  }

  private User getCurrentUser() {
    return userRepository
        .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }
}
