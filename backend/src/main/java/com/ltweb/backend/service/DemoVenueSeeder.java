package com.ltweb.backend.service;

import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.entity.Seat;
import com.ltweb.backend.enums.BranchStatus;
import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.RoomTechnology;
import com.ltweb.backend.enums.SeatType;
import com.ltweb.backend.repository.BranchRepository;
import com.ltweb.backend.repository.RoomRepository;
import com.ltweb.backend.repository.SeatRepository;
import com.ltweb.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Dữ liệu demo cho rạp: chi nhánh, phòng chiếu, sơ đồ ghế, và gán tài khoản manager/staff demo vào
 * chi nhánh đầu tiên. Chạy lại nhiều lần vẫn an toàn.
 */
@Component
@RequiredArgsConstructor
class DemoVenueSeeder {
  private final UserRepository userRepository;
  private final BranchRepository branchRepository;
  private final RoomRepository roomRepository;
  private final SeatRepository seatRepository;

  /** Cập nhật hoặc tạo chi nhánh, phòng và ghế demo, trả danh sách phòng để xếp lịch chiếu. */
  List<Room> seed() {
    return seedBranchesRoomsAndSeats();
  }

  private List<Room> seedBranchesRoomsAndSeats() {
    List<BranchSeed> branchSeeds =
        List.of(
            new BranchSeed(
                "CN-HCM-01",
                "MoviePTIT Nguyễn Huệ",
                "10 Nguyễn Huệ, Quận 1",
                "TP. Hồ Chí Minh",
                "0901000001"),
            new BranchSeed(
                "CN-HCM-02",
                "MoviePTIT Landmark",
                "720A Điện Biên Phủ, Bình Thạnh",
                "TP. Hồ Chí Minh",
                "0901000002"),
            new BranchSeed(
                "CN-HN-01", "MoviePTIT Hồ Gươm", "20 Hàng Bài, Hoàn Kiếm", "Hà Nội", "0901000003"),
            new BranchSeed(
                "CN-DN-01",
                "MoviePTIT Sông Hàn",
                "15 Bạch Đằng, Hải Châu",
                "Đà Nẵng",
                "0901000004"));

    Map<String, Branch> branches = new LinkedHashMap<>();
    for (BranchSeed seed : branchSeeds) {
      Branch branch = branchRepository.findByBranchCode(seed.branchCode()).orElseGet(Branch::new);
      branch.setBranchCode(seed.branchCode());
      branch.setName(seed.name());
      branch.setAddress(seed.address());
      branch.setCity(seed.city());
      branch.setPhone(seed.phone());
      branch.setStatus(BranchStatus.ACTIVE);
      branches.put(seed.branchCode(), branchRepository.save(branch));
    }

    List<Room> rooms = new ArrayList<>();
    branches.values().forEach(branch -> rooms.addAll(seedRooms(branch)));
    branches.values().stream().findFirst().ifPresent(this::assignDemoStaffToBranch);
    rooms.forEach(this::seedSeats);
    return rooms;
  }

  private void assignDemoStaffToBranch(Branch branch) {
    userRepository
        .findByUsername("manager")
        .ifPresent(
            manager -> {
              manager.setBranchId(branch.getBranchId());
              userRepository.save(manager);
            });
    userRepository
        .findByUsername("staff")
        .ifPresent(
            staff -> {
              staff.setBranchId(branch.getBranchId());
              userRepository.save(staff);
            });
  }

  private List<Room> seedRooms(Branch branch) {
    List<RoomSeed> roomSeeds =
        List.of(
            new RoomSeed("R01", "Phòng Standard 1", RoomTechnology.STANDARD),
            new RoomSeed("R02", "Phòng IMAX Atmos", RoomTechnology.IMAX),
            new RoomSeed("R03", "Phòng 4DX Motion", RoomTechnology.FOUR_DX));

    List<Room> rooms = new ArrayList<>();
    for (RoomSeed seed : roomSeeds) {
      Room room =
          roomRepository
              .findByBranchBranchIdAndCode(branch.getBranchId(), seed.code())
              .orElseGet(Room::new);
      room.setBranch(branch);
      room.setCode(seed.code());
      room.setName(seed.name());
      room.setRoomTechnology(seed.roomTechnology());
      room.setSeatCapacity(50);
      room.setStatus(RoomStatus.ACTIVE);
      rooms.add(roomRepository.save(room));
    }
    return rooms;
  }

  private void seedSeats(Room room) {
    for (char row = 'A'; row <= 'E'; row++) {
      for (int seatNumber = 1; seatNumber <= 10; seatNumber++) {
        String rowLabel = String.valueOf(row);
        String seatCode = rowLabel + seatNumber;
        if (seatRepository.existsByRoomIdAndSeatCode(room.getId(), seatCode)) {
          continue;
        }

        SeatType seatType =
            switch (row) {
              case 'A', 'B' -> SeatType.STANDARD;
              case 'C', 'D' -> SeatType.VIP;
              default -> SeatType.COUPLE;
            };

        seatRepository.save(
            Seat.builder()
                .room(room)
                .seatCode(seatCode)
                .rowLabel(rowLabel)
                .seatNumber(seatNumber)
                .seatType(seatType)
                .build());
      }
    }
  }

  private record BranchSeed(
      String branchCode, String name, String address, String city, String phone) {}

  private record RoomSeed(String code, String name, RoomTechnology roomTechnology) {}
}
