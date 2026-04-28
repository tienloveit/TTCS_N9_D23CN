package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateSeatRequest;
import com.ltweb.backend.dto.request.UpdateSeatRequest;
import com.ltweb.backend.dto.response.SeatResponse;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.SeatMapper;
import com.ltweb.backend.repository.RoomRepository;
import com.ltweb.backend.repository.SeatRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SeatService {

  private final SeatRepository seatRepository;
  private final RoomRepository roomRepository;
  private final SeatMapper seatMapper;

  public SeatResponse createSeat(CreateSeatRequest request) {

    if (seatRepository.existsByRoomIdAndSeatCode(request.getRoomId(), request.getSeatCode())) {
      throw new AppException(ErrorCode.SEAT_DUPLICATE);
    }

    Seat seat = seatMapper.toSeat(request);

    Room room = getRoom(request.getRoomId());
    seat.setRoom(room);

    return seatMapper.toSeatResponse(seatRepository.save(seat));
  }

  @Transactional
  public SeatResponse updateSeat(Long seatId, UpdateSeatRequest request) {

    Seat seat = getSeat(seatId);

    seatMapper.updateSeat(seat, request);

    Room room = getRoom(request.getRoomId());
    seat.setRoom(room);

    return seatMapper.toSeatResponse(seatRepository.save(seat));
  }

  @Transactional
  public void deleteSeat(Long seatId) {
    Seat seat = getSeat(seatId);
    seatRepository.delete(seat);
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
}
