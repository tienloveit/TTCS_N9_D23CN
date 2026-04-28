package com.ltweb.backend.entity;

import com.ltweb.backend.enums.BranchStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "branches")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class Branch {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "branch_id")
  private Long branchId;

  @Column(unique = true, name = "branch_code")
  private String branchCode;

  @Column(nullable = false)
  private String name;

  private String address;

  private String city;

  private String phone;

  @Enumerated(EnumType.STRING)
  private BranchStatus status;
}
