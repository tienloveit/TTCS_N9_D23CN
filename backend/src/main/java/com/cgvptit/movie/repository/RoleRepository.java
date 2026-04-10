package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Integer> {
}