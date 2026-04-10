package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketRepository extends JpaRepository<Ticket, Integer> {
}