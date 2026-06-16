package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateRoomRequest;
import com.ltweb.backend.dto.request.UpdateRoomRequest;
import com.ltweb.backend.dto.response.RoomResponse;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.SeatType;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.RoomMapper;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.RoomRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.ShowtimeRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RoomService {
    private final RoomRepository roomRepository;
    private final BranchRepository branchRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final RoomMapper roomMapper;

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request) {
        requireBranchAccess(request.getBranchId());
        Branch branch = getBranch(request.getBranchId());

        Room room = roomMapper.toRoomEntity(request);
        room.setBranch(branch);
        Room savedRoom = roomRepository.save(room);

        generateSeats(savedRoom);

        return roomMapper.toRoomResponse(savedRoom);
    }

    public List<RoomResponse> getAllRooms(Long branchId, RoomStatus status) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.MANAGER) {
            branchId = requireManagedBranch(user);
        }
        List<Room> room = roomRepository.findByBranchIdAndStatus(branchId, status);
        return room.stream().map(roomMapper::toRoomResponse).toList();
    }

    public RoomResponse getRoomById(Long roomId) {
        Room room = getRoom(roomId);
        requireBranchAccess(room.getBranch().getBranchId());
        return roomMapper.toRoomResponse(room);
    }

    @Transactional
    public RoomResponse updateRoom(Long roomId, UpdateRoomRequest request) {
        Room room = getRoom(roomId);
        requireBranchAccess(room.getBranch().getBranchId());

        Integer oldCapacity = room.getSeatCapacity();
        roomMapper.updateRoom(room, request);

        if (request.getBranchId() != null) {
            requireBranchAccess(request.getBranchId());
            Branch branch = getBranch(request.getBranchId());
            room.setBranch(branch);
        }

        Room savedRoom = roomRepository.save(room);

        // Nếu thay đổi sức chứa, cần vẽ lại sơ đồ ghế
        if (request.getSeatCapacity() != null && !request.getSeatCapacity().equals(oldCapacity)) {
            // Kiểm tra xem phòng này đã có suất chiếu chưa
            if (showtimeRepository.existsByRoomId(roomId)) {
                throw new AppException(ErrorCode.ROOM_HAS_SHOWTIMES);
            }

            seatRepository.deleteByRoomId(roomId);
            generateSeats(savedRoom);
        }

        return roomMapper.toRoomResponse(savedRoom);
    }

    public void deleteRoom(Long roomId) {
        Room room = getRoom(roomId);
        requireBranchAccess(room.getBranch().getBranchId());
        roomRepository.delete(room);
    }

    // ===== PRIVATE HELPER =====
    private void generateSeats(Room room) {
        int capacity = room.getSeatCapacity();
        // Intelligent grid calculation
        int cols = (int) Math.ceil(Math.sqrt(capacity * 1.8));
        int rows = (int) Math.ceil((double) capacity / cols);

        // Determine VIP rows (middle section)
        int midRow = rows / 2;
        java.util.Set<Integer> vipRowIndices = new java.util.HashSet<>();
        if (rows > 3) {
            vipRowIndices.add(midRow - 1);
            vipRowIndices.add(midRow);
            vipRowIndices.add(midRow + 1);
        } else {
            vipRowIndices.add(midRow);
        }

        int seatCount = 0;
        List<Seat> seats = new ArrayList<>();
        for (int r = 0; r < rows; r++) {
            char rowChar = (char) ('A' + r);
            String rowLabel = String.valueOf(rowChar);

            for (int c = 1; c <= cols; c++) {
                if (++seatCount > capacity) {
                    break;
                }

                SeatType type = vipRowIndices.contains(r) ? SeatType.VIP : SeatType.STANDARD;

                seats.add(
                        Seat.builder()
                                .room(room)
                                .rowLabel(rowLabel)
                                .seatNumber(c)
                                .seatCode(rowLabel + c)
                                .seatType(type)
                                .isActive(true)
                                .build());
            }
        }
        seatRepository.saveAll(seats);
    }

    private Room getRoom(Long roomId) {
        return roomRepository
                .findById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
    }

    private Branch getBranch(Long branchId) {
        return branchRepository
                .findById(branchId)
                .orElseThrow(() -> new AppException(ErrorCode.BRANCH_NOT_FOUND));
    }

    private void requireBranchAccess(Long branchId) {
        User user = getCurrentUser();
        if (user.getRole() == UserRole.ADMIN) {
            return;
        }
        if (user.getRole() == UserRole.MANAGER
                && Objects.equals(requireManagedBranch(user), branchId)) {
            return;
        }
        throw new AccessDeniedException("Branch access denied");
    }

    private Long requireManagedBranch(User user) {
        if (user.getBranchId() == null) {
            throw new AccessDeniedException("Manager is not assigned to a branch");
        }
        return user.getBranchId();
    }

    private User getCurrentUser() {
        return userRepository
                .findByUsername(SecurityContextHolder.getContext().getAuthentication().getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
}
