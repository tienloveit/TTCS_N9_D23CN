package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateBranchRequest;
import com.ltweb.backend.dto.request.UpdateBranchRequest;
import com.ltweb.backend.dto.response.BranchResponse;
import com.ltweb.backend.entity.Branch;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface BranchMapper {

  @Mapping(target = "branchId", ignore = true)
  Branch toBranchEntity(CreateBranchRequest createBranchRequest);

  BranchResponse toBranchResponse(Branch branch);

  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  @Mapping(target = "branchId", ignore = true)
  void updateBranch(UpdateBranchRequest request, @MappingTarget Branch branch);
}
