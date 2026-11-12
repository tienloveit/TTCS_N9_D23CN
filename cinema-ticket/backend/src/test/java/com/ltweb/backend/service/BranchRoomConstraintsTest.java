package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ltweb.backend.dto.request.CreateBranchRequest;
import com.ltweb.backend.dto.request.CreateRoomRequest;
import com.ltweb.backend.dto.request.UpdateBranchRequest;
import com.ltweb.backend.dto.request.UpdateRoomRequest;
import com.ltweb.backend.entity.Branch;
import com.ltweb.backend.entity.Room;
import com.ltweb.backend.enums.BranchStatus;
import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.mapper.BranchMapperImpl;
import com.ltweb.backend.mapper.RoomMapperImpl;
import jakarta.validation.Validation;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class BranchRoomConstraintsTest {
  @Test
  void omittedStatusBecomesActiveBeforeInsertEvenWhenMapperAssignsNull() {
    Branch branch =
        new BranchMapperImpl()
            .toBranchEntity(
                CreateBranchRequest.builder().branchCode("CN01").name("Cinema").build());
    Room room = new RoomMapperImpl().toRoomEntity(CreateRoomRequest.builder().code("P01").build());
    ReflectionTestUtils.invokeMethod(branch, "initializeStatus");
    ReflectionTestUtils.invokeMethod(room, "initializeStatus");
    assertThat(branch.getStatus()).isEqualTo(BranchStatus.ACTIVE);
    assertThat(room.getStatus()).isEqualTo(RoomStatus.ACTIVE);
  }

  @Test
  void explicitInactiveAndMaintenanceAreRetained() {
    Branch branch = Branch.builder().status(BranchStatus.INACTIVE).build();
    Room room = Room.builder().status(RoomStatus.MAINTENANCE).build();
    ReflectionTestUtils.invokeMethod(branch, "initializeStatus");
    ReflectionTestUtils.invokeMethod(room, "initializeStatus");
    assertThat(branch.getStatus()).isEqualTo(BranchStatus.INACTIVE);
    assertThat(room.getStatus()).isEqualTo(RoomStatus.MAINTENANCE);
  }

  @Test
  void roomCodesAreLimitedToFiftyCharactersAndUpdatesRejectBlankCodes() {
    try (var factory = Validation.buildDefaultValidatorFactory()) {
      var validator = factory.getValidator();
      assertThat(
              validator.validateProperty(
                  CreateRoomRequest.builder().code("P".repeat(50)).build(), "code"))
          .isEmpty();
      assertThat(
              validator.validateProperty(
                  CreateRoomRequest.builder().code("P".repeat(51)).build(), "code"))
          .isNotEmpty();
      assertThat(validator.validateProperty(UpdateRoomRequest.builder().code(" ").build(), "code"))
          .isNotEmpty();
      assertThat(
              validator.validateProperty(
                  UpdateBranchRequest.builder().branchCode("").build(), "branchCode"))
          .isNotEmpty();
      assertThat(validator.validateProperty(UpdateRoomRequest.builder().build(), "code")).isEmpty();
      assertThat(validator.validateProperty(UpdateBranchRequest.builder().build(), "branchCode"))
          .isEmpty();
    }
  }

  @Test
  void branchTimestampsAreReturnedAndNotOverwrittenByPartialUpdates() {
    var created = LocalDateTime.of(2026, 11, 11, 10, 0);
    var updated = created.plusHours(1);
    Branch branch =
        Branch.builder().createdAt(created).updatedAt(updated).status(BranchStatus.ACTIVE).build();
    var mapper = new BranchMapperImpl();
    mapper.updateBranch(UpdateBranchRequest.builder().name("Updated").build(), branch);
    var response = mapper.toBranchResponse(branch);
    assertThat(response.getCreatedAt()).isEqualTo(created);
    assertThat(response.getUpdatedAt()).isEqualTo(updated);
    assertThat(response.getStatus()).isEqualTo(BranchStatus.ACTIVE);
  }
}
