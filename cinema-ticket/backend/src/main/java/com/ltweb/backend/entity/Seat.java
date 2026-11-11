package com.ltweb.backend.entity;

import com.ltweb.backend.enums.SeatType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "seats", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "room_id", "seat_code" }),
    @UniqueConstraint(name = "uk_seats_room_row_number", columnNames = { "room_id", "row_label", "seat_number" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "seat_code", nullable = false)
    private String seatCode;

    private String rowLabel;

    private Integer seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @org.hibernate.annotations.ColumnDefault("'STANDARD'")
    @Builder.Default
    private SeatType seatType = SeatType.STANDARD;

    @jakarta.persistence.PrePersist
    private void initializeSeatType() {
        if (seatType == null) seatType = SeatType.STANDARD;
    }
}
