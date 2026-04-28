package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateBranchRequest;
import com.ltweb.backend.dto.request.UpdateBranchRequest;
import com.ltweb.backend.dto.response.BranchResponse;
import com.ltweb.backend.entity.Branch;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class BranchMapperImpl implements BranchMapper {

    @Override
    public Branch toBranchEntity(CreateBranchRequest createBranchRequest) {
        if ( createBranchRequest == null ) {
            return null;
        }

        Branch.BranchBuilder branch = Branch.builder();

        branch.address( createBranchRequest.getAddress() );
        branch.branchCode( createBranchRequest.getBranchCode() );
        branch.city( createBranchRequest.getCity() );
        branch.name( createBranchRequest.getName() );
        branch.phone( createBranchRequest.getPhone() );
        branch.status( createBranchRequest.getStatus() );

        return branch.build();
    }

    @Override
    public BranchResponse toBranchResponse(Branch branch) {
        if ( branch == null ) {
            return null;
        }

        BranchResponse.BranchResponseBuilder branchResponse = BranchResponse.builder();

        branchResponse.address( branch.getAddress() );
        branchResponse.branchCode( branch.getBranchCode() );
        branchResponse.branchId( branch.getBranchId() );
        branchResponse.city( branch.getCity() );
        branchResponse.name( branch.getName() );
        branchResponse.phone( branch.getPhone() );
        branchResponse.status( branch.getStatus() );

        return branchResponse.build();
    }

    @Override
    public void updateBranch(UpdateBranchRequest request, Branch branch) {
        if ( request == null ) {
            return;
        }

        if ( request.getAddress() != null ) {
            branch.setAddress( request.getAddress() );
        }
        if ( request.getBranchCode() != null ) {
            branch.setBranchCode( request.getBranchCode() );
        }
        if ( request.getCity() != null ) {
            branch.setCity( request.getCity() );
        }
        if ( request.getName() != null ) {
            branch.setName( request.getName() );
        }
        if ( request.getPhone() != null ) {
            branch.setPhone( request.getPhone() );
        }
        if ( request.getStatus() != null ) {
            branch.setStatus( request.getStatus() );
        }
    }
}
