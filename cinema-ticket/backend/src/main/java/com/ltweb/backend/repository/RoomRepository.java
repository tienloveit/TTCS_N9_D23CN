package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Room;
import com.ltweb.backend.enums.RoomStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

  @EntityGraph(attributePaths = {"branch"})
  Optional<Room> findById(Long id);

  @EntityGraph(attributePaths = {"branch"})
  Optional<Room> findByBranchBranchIdAndCode(Long branchId, String code);

  @EntityGraph(attributePaths = {"branch"})
  @Query(
      "select r from Room r where "
          + "(:branchId is null or r.branch.branchId =:branchId) "
          + "and (:status is null or r.status =:status)")
  List<Room> findByBranchIdAndStatus(
      @Param("branchId") Long branchId, @Param("status") RoomStatus status);
}
