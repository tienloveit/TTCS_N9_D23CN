package com.ltweb.backend.repository;

import com.ltweb.backend.entity.Branch;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {
  Optional<Branch> findByBranchCode(String branchCode);
}
