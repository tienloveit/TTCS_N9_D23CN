package com.cgvptit.movie.repository;

import com.cgvptit.movie.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomRepository extends JpaRepository<Room, Integer> {
    List<Room> findByCinemaId(Integer cinemaId);
}