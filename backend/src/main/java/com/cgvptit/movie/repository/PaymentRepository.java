package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {
}