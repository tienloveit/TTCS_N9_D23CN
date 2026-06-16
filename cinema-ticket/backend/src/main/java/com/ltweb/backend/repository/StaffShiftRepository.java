package com.ltweb.backend.repository;

import com.ltweb.backend.entity.StaffShift;
import com.ltweb.backend.enums.StaffShiftStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffShiftRepository extends JpaRepository<StaffShift, Long> {

    @EntityGraph(attributePaths = { "staff" })
    Optional<StaffShift> findFirstByStaffIdAndStatusOrderByOpenedAtDesc(
            Long staffId, StaffShiftStatus status);

    @EntityGraph(attributePaths = { "staff" })
    List<StaffShift> findByStaffIdOrderByOpenedAtDesc(Long staffId);

    @EntityGraph(attributePaths = { "staff", "schedule" })
    List<StaffShift> findByScheduleIdOrderByOpenedAtDesc(Long scheduleId);
}
