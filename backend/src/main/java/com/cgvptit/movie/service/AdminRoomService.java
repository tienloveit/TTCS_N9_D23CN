package com.cgvptit.movie.service;

import com.cgvptit.movie.dto.request.RoomRequestDTO;
import com.cgvptit.movie.dto.request.RoomUpdateDTO;
import com.cgvptit.movie.dto.request.SeatTypeUpdateDTO;
import com.cgvptit.movie.entity.Room;
import com.cgvptit.movie.entity.Seat;

import java.util.List;

public interface AdminRoomService {
    List<Room> getRoomsByCinemaId(Integer cinemaId);
    Room getRoomById(Integer id);
    Room createRoomWithSeats(RoomRequestDTO request);
    Room updateRoom(Integer id, RoomUpdateDTO request);
    void deleteRoom(Integer id);
    List<Seat> getSeatsByRoomId(Integer roomId);
    Seat updateSeatType(Integer roomId, Integer seatId, SeatTypeUpdateDTO request);
}
