package com.cgvptit.movie.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "cinema_room")
public class CinemaRoom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "room_name", length = 255)
    private String roomName;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "room_factor", precision = 18, scale = 2)
    private BigDecimal roomFactor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cinema_id")
    private Cinema cinema;

    public CinemaRoom() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getRoomFactor() { return roomFactor; }
    public void setRoomFactor(BigDecimal roomFactor) { this.roomFactor = roomFactor; }

    public Cinema getCinema() { return cinema; }
    public void setCinema(Cinema cinema) { this.cinema = cinema; }
}
