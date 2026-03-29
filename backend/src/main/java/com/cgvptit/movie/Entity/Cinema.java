package com.cgvptit.movie.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cinema")
public class Cinema {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "cinema_name", length = 255)
    private String cinemaName;

    public Cinema() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getCinemaName() { return cinemaName; }
    public void setCinemaName(String cinemaName) { this.cinemaName = cinemaName; }
}
