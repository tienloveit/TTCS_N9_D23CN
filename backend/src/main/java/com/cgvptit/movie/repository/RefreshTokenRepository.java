package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.RefreshToken;
import com.cgvptit.movie.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Integer> {
    Optional<RefreshToken> findByToken(String token);
    void deleteByUser(User user);
}
