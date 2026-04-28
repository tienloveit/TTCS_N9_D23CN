package com.ltweb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "directors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Director {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "director_id")
  private Long id;

  @Column(nullable = false, unique = true)
  private String name;

  @Column(length = 1000)
  private String bio;

  @OneToMany(mappedBy = "director")
  @Builder.Default
  private List<Movie> movies = new ArrayList<>();
}
