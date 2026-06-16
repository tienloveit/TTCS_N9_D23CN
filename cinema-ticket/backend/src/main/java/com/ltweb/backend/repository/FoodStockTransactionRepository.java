package com.ltweb.backend.repository;

import com.ltweb.backend.entity.FoodStockTransaction;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FoodStockTransactionRepository extends JpaRepository<FoodStockTransaction, Long> {
    @EntityGraph(attributePaths = { "food", "createdBy" })
    List<FoodStockTransaction> findTop200ByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = { "food", "createdBy" })
    List<FoodStockTransaction> findTop200ByBranchIdOrderByCreatedAtDesc(Long branchId);

    @EntityGraph(attributePaths = { "food", "createdBy" })
    List<FoodStockTransaction> findTop100ByFoodIdOrderByCreatedAtDesc(Long foodId);
}
