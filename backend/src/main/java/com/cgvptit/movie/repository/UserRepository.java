package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Integer> {
}