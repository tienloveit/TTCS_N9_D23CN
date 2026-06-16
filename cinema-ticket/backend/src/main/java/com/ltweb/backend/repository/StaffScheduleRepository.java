package com.ltweb.backend.repository;

import com.ltweb.backend.entity.StaffSchedule;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffScheduleRepository extends JpaRepository<StaffSchedule, Long> {
    @EntityGraph(attributePaths = { "staff", "createdBy" })
    List<StaffSchedule> findByStaffIdOrderByStartTimeDesc(Long staffId);

    @EntityGraph(attributePaths = { "staff", "createdBy" })
    List<StaffSchedule> findByStaffIdAndEndTimeGreaterThanEqualOrderByStartTimeAsc(
            Long staffId, LocalDateTime from);

    @EntityGraph(attributePaths = { "staff", "createdBy" })
    List<StaffSchedule> findByBranchIdOrderByStartTimeDesc(Long branchId);

    @EntityGraph(attributePaths = { "staff", "createdBy" })
    List<StaffSchedule> findByStaffIdAndStartTimeLessThanEqualAndEndTimeGreaterThanEqualAndStatusOrderByStartTimeDesc(
            Long staffId,
            LocalDateTime latestStart,
            LocalDateTime earliestEnd,
            com.ltweb.backend.enums.StaffScheduleStatus status);
}
