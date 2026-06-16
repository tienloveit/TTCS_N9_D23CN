package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Food;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodRepository extends JpaRepository<Food, Long> {
    List<Food> findByActiveTrueOrderByNameAsc();

    List<Food> findByBranchIdAndActiveTrueOrderByNameAsc(Long branchId);

    List<Food> findByBranchId(Long branchId);

    Optional<Food> findFirstByNameIgnoreCase(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Food> findByIdIn(Collection<Long> ids);
}
