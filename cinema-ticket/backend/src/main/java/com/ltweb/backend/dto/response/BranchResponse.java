package com.ltweb.backend.dto.response;

import com.ltweb.backend.enums.BranchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchResponse {
  private Long branchId;
  private String branchCode;
  private String name;
  private String address;
  private String city;
  private String phone;
  private BranchStatus status;
}
