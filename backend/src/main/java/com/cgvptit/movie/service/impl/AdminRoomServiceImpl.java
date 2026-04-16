package com.cgvptit.movie.service.impl;

import com.cgvptit.movie.dto.request.RoomRequestDTO;
import com.cgvptit.movie.dto.request.RoomUpdateDTO;
import com.cgvptit.movie.dto.request.SeatTypeUpdateDTO;
import com.cgvptit.movie.entity.Cinema;
import com.cgvptit.movie.entity.Room;
import com.cgvptit.movie.entity.Seat;
import com.cgvptit.movie.enums.SeatType;
import com.cgvptit.movie.repository.CinemaRepository;
import com.cgvptit.movie.repository.RoomRepository;
import com.cgvptit.movie.repository.SeatRepository;
import com.cgvptit.movie.service.AdminRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminRoomServiceImpl implements AdminRoomService {

    private final RoomRepository roomRepository;
    private final CinemaRepository cinemaRepository;
    private final SeatRepository seatRepository;

    @Override
    public List<Room> getRoomsByCinemaId(Integer cinemaId) {
        return roomRepository.findByCinemaId(cinemaId);
    }

    @Override
    public Room getRoomById(Integer id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng chiếu"));
    }

    @Override
    @Transactional
    public Room createRoomWithSeats(RoomRequestDTO request) {
        Cinema cinema = cinemaRepository.findById(request.getCinemaId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy rạp chiếu phim"));

        int capacity = request.getRowCount() * request.getSeatPerRow();

        // 1. Tạo phòng
        Room room = Room.builder()
                .cinema(cinema)
                .name(request.getName())
                .capacity(capacity)
                .build();
        Room savedRoom = roomRepository.save(room);

        // 2. Chạy vòng lặp sinh ghế (A1, A2... B1, B2)
        List<Seat> seatsToSave = new ArrayList<>();
        char startChar = 'A';
        for (int i = 0; i < request.getRowCount(); i++) {
            String rowChar = String.valueOf((char) (startChar + i));
            for (int j = 1; j <= request.getSeatPerRow(); j++) {
                Seat seat = Seat.builder()
                        .room(savedRoom)
                        .rowChar(rowChar)
                        .number(j)
                        .seatType(SeatType.STANDARD)
                        .isActive(true)
                        .build();
                seatsToSave.add(seat);
            }
        }
        
        // Save all seats in batch
        seatRepository.saveAll(seatsToSave);

        return savedRoom;
    }

    @Override
    @Transactional
    public Room updateRoom(Integer id, RoomUpdateDTO request) {
        Room room = getRoomById(id);
        room.setName(request.getName());
        return roomRepository.save(room);
    }

    @Override
    @Transactional
    public void deleteRoom(Integer id) {
        if (!roomRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng chiếu");
        }
        // Xóa hết ghế trước (Foreign Key constraint)
        seatRepository.deleteByRoomId(id);
        
        // Sau đó xóa phòng
        roomRepository.deleteById(id);
    }

    @Override
    public List<Seat> getSeatsByRoomId(Integer roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng chiếu");
        }
        return seatRepository.findByRoomId(roomId);
    }

    @Override
    @Transactional
    public Seat updateSeatType(Integer roomId, Integer seatId, SeatTypeUpdateDTO request) {
        Seat seat = seatRepository.findById(seatId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ghế"));

        // Xác minh ghế thật sự thuộc phòng đó
        if (!seat.getRoom().getId().equals(roomId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ghế này không thuộc phòng chiếu đã chỉ định");
        }

        seat.setSeatType(request.getSeatType());
        return seatRepository.save(seat);
    }
}
