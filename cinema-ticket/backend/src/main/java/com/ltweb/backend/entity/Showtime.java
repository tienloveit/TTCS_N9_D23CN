package com.ltweb.backend.entity;

import com.ltweb.backend.enums.ShowtimeStatus;
import com.ltweb.backend.enums.ScreeningFormat;
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
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "showtimes")
@org.hibernate.annotations.Check(constraints = "end_time > start_time")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Showtime {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @Column(name = "start_time", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShowtimeStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "screening_format", nullable = false)
    @org.hibernate.annotations.ColumnDefault("'TWO_D'")
    @Builder.Default
    private ScreeningFormat screeningFormat = ScreeningFormat.TWO_D;

    @jakarta.persistence.PrePersist
    private void initializeScreeningFormat() {
        if (screeningFormat == null) screeningFormat = ScreeningFormat.TWO_D;
    }
}
