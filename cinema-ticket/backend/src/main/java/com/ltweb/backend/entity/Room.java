package com.ltweb.backend.entity;

import com.ltweb.backend.enums.RoomStatus;
import com.ltweb.backend.enums.RoomTechnology;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "rooms", uniqueConstraints = { @UniqueConstraint(columnNames = { "branch_id", "code" }) })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String code;

    private String name;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "room_technology", nullable = false)
    @ColumnDefault("'STANDARD'")
    private RoomTechnology roomTechnology = RoomTechnology.STANDARD;

    private Integer seatCapacity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @ColumnDefault("'ACTIVE'")
    @Builder.Default
    private RoomStatus status = RoomStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @PrePersist
    private void initializeStatus() {
        if (status == null) status = RoomStatus.ACTIVE;
        if (roomTechnology == null) roomTechnology = RoomTechnology.STANDARD;
    }
}
