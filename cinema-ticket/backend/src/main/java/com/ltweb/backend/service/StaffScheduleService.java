package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateStaffScheduleRequest;
import com.ltweb.backend.dto.request.UpdateStaffScheduleRequest;
import com.ltweb.backend.dto.response.StaffDetailResponse;
import com.ltweb.backend.dto.response.StaffScheduleResponse;
import com.ltweb.backend.entity.StaffSchedule;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.StaffScheduleStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.UserMapper;
import com.ltweb.backend.repository.StaffScheduleRepository;
import com.ltweb.backend.repository.StaffShiftRepository;
import com.ltweb.backend.repository.UserRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StaffScheduleService {
  private final StaffScheduleRepository staffScheduleRepository;
  private final StaffShiftRepository staffShiftRepository;
  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final StaffOperationsService staffOperationsService;

  @Transactional(readOnly = true)
  public StaffDetailResponse getStaffDetail(Long staffId) {
    User staff = getManagedStaff(staffId);
    return StaffDetailResponse.builder()
        .staff(userMapper.toUserResponse(staff))
        .schedules(getSchedulesForStaff(staff.getId()))
        .shiftHistory(
            staffShiftRepository.findByStaffIdOrderByOpenedAtDesc(staff.getId()).stream()
                .map(staffOperationsService::toShiftResponseForHistory)
                .toList())
        .build();
  }

  @Transactional(readOnly = true)
  public List<StaffScheduleResponse> getSchedulesForStaff(Long staffId) {
    User staff = getManagedStaff(staffId);
    return staffScheduleRepository.findByStaffIdOrderByStartTimeDesc(staff.getId()).stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public List<StaffScheduleResponse> getMySchedules() {
    User staff = getCurrentUser();
    return staffScheduleRepository
        .findByStaffIdAndEndTimeGreaterThanEqualOrderByStartTimeAsc(
            staff.getId(), LocalDateTime.now().minusDays(30))
        .stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public StaffScheduleResponse createSchedule(CreateStaffScheduleRequest request) {
    User manager = getCurrentUser();
    User staff = getManagedStaff(request.getStaffId());
    validateTimeWindow(request.getStartTime(), request.getEndTime());

    StaffSchedule schedule =
        StaffSchedule.builder()
            .staff(staff)
            .createdBy(manager)
            .branchId(staff.getBranchId())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .position(trimToDefault(request.getPosition(), "Quầy vé"))
            .note(request.getNote())
            .status(StaffScheduleStatus.SCHEDULED)
            .build();
    return toResponse(staffScheduleRepository.save(schedule));
  }

  @Transactional
  public StaffScheduleResponse updateSchedule(Long scheduleId, UpdateStaffScheduleRequest request) {
    StaffSchedule schedule = getManagedSchedule(scheduleId);

    LocalDateTime nextStart =
        request.getStartTime() == null ? schedule.getStartTime() : request.getStartTime();
    LocalDateTime nextEnd =
        request.getEndTime() == null ? schedule.getEndTime() : request.getEndTime();
    validateTimeWindow(nextStart, nextEnd);

    schedule.setStartTime(nextStart);
    schedule.setEndTime(nextEnd);
    if (request.getPosition() != null) {
      schedule.setPosition(trimToDefault(request.getPosition(), "Quầy vé"));
    }
    if (request.getNote() != null) {
      schedule.setNote(request.getNote());
    }
    if (request.getStatus() != null) {
      schedule.setStatus(request.getStatus());
    }
    return toResponse(staffScheduleRepository.save(schedule));
  }

  @Transactional
  public StaffScheduleResponse cancelSchedule(Long scheduleId) {
    StaffSchedule schedule = getManagedSchedule(scheduleId);
    schedule.setStatus(StaffScheduleStatus.CANCELLED);
    return toResponse(staffScheduleRepository.save(schedule));
  }

  private StaffSchedule getManagedSchedule(Long scheduleId) {
    StaffSchedule schedule =
        staffScheduleRepository
            .findById(scheduleId)
            .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR));
    requireStaffAccess(schedule.getStaff());
    return schedule;
  }

  private User getManagedStaff(Long staffId) {
    User staff =
        userRepository.findById(staffId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    requireStaffAccess(staff);
    return staff;
  }

  private void requireStaffAccess(User staff) {
    User currentUser = getCurrentUser();
    if (currentUser.getRole() == UserRole.ADMIN) {
      if (staff.getRole() != UserRole.STAFF) {
        throw new AccessDeniedException("Only staff users can be scheduled");
      }
      return;
    }
    if (currentUser.getRole() == UserRole.MANAGER
        && staff.getRole() == UserRole.STAFF
        && currentUser.getBranchId() != null
        && Objects.equals(staff.getBranchId(), currentUser.getBranchId())) {
      return;
    }
    throw new AccessDeniedException("Staff access denied");
  }

  private User getCurrentUser() {
    String username = SecurityContextHolder.getContext().getAuthentication().getName();
    return userRepository
        .findByUsername(username)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateTimeWindow(LocalDateTime startTime, LocalDateTime endTime) {
    if (startTime == null || endTime == null || !endTime.isAfter(startTime)) {
      throw new AppException(ErrorCode.VALIDATION_ERROR);
    }
  }

  private StaffScheduleResponse toResponse(StaffSchedule schedule) {
    User staff = schedule.getStaff();
    User creator = schedule.getCreatedBy();
    return StaffScheduleResponse.builder()
        .scheduleId(schedule.getId())
        .staffId(staff == null ? null : staff.getId())
        .staffUsername(staff == null ? null : staff.getUsername())
        .staffFullName(staff == null ? null : staff.getFullName())
        .branchId(schedule.getBranchId())
        .startTime(schedule.getStartTime())
        .endTime(schedule.getEndTime())
        .durationMinutes(durationMinutes(schedule.getStartTime(), schedule.getEndTime()))
        .position(schedule.getPosition())
        .note(schedule.getNote())
        .status(schedule.getStatus())
        .createdById(creator == null ? null : creator.getId())
        .createdByUsername(creator == null ? null : creator.getUsername())
        .createdAt(schedule.getCreatedAt())
        .updatedAt(schedule.getUpdatedAt())
        .build();
  }

  private Long durationMinutes(LocalDateTime startTime, LocalDateTime endTime) {
    if (startTime == null || endTime == null) {
      return null;
    }
    return Math.max(Duration.between(startTime, endTime).toMinutes(), 0);
  }

  private String trimToDefault(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value.trim();
  }
}
