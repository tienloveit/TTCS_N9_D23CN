package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserRepository extends JpaRepository<User, Integer> {
    Page<User> findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrPhoneContainingIgnoreCase(
            String fullName, String email, String phone, Pageable pageable);

    List<User> findByRoleId(Integer roleId);
}