package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Integer> {
}