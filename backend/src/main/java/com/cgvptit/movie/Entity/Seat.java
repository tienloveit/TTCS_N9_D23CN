package com.cgvptit.movie.Entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "seat")
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "seat_row", length = 10)
    private String seatRow;

    @Column(name = "seat_number")
    private Integer seatNumber;

    @Column(name = "seat_status", length = 20)
    private String seatStatus;

    @Column(name = "seat_type", length = 45)
    private String seatType;

    @Column(name = "seat_factor", precision = 18, scale = 2)
    private BigDecimal seatFactor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cinema_room_id")
    private CinemaRoom cinemaRoom;

    public Seat() {}

    public Integer getSeatId() { return id; }
    public void setSeatId(Integer seatId) { this.id = seatId; }

    public String getSeatRow() { return seatRow; }
    public void setSeatRow(String seatRow) { this.seatRow = seatRow; }

    public Integer getSeatNumber() { return seatNumber; }
    public void setSeatNumber(Integer seatNumber) { this.seatNumber = seatNumber; }

    public String getSeatStatus() { return seatStatus; }
    public void setSeatStatus(String seatStatus) { this.seatStatus = seatStatus; }

    public String getSeatType() { return seatType; }
    public void setSeatType(String seatType) { this.seatType = seatType; }

    public BigDecimal getSeatFactor() { return seatFactor; }
    public void setSeatFactor(BigDecimal seatFactor) { this.seatFactor = seatFactor; }

    public CinemaRoom getCinemaRoom() { return cinemaRoom; }
    public void setCinemaRoom(CinemaRoom cinemaRoom) { this.cinemaRoom = cinemaRoom; }
}
