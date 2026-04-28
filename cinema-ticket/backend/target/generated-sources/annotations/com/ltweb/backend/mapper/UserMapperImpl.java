package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateUserRequest;
import com.ltweb.backend.dto.request.UpdateUserRequest;
import com.ltweb.backend.dto.response.UserResponse;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.Gender;
import com.ltweb.backend.enums.UserStatus;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class UserMapperImpl implements UserMapper {

    @Override
    public User toUser(CreateUserRequest request) {
        if ( request == null ) {
            return null;
        }

        User.UserBuilder user = User.builder();

        user.dob( request.getDob() );
        user.email( request.getEmail() );
        user.fullName( request.getFullName() );
        if ( request.getGender() != null ) {
            user.gender( Enum.valueOf( Gender.class, request.getGender() ) );
        }
        user.phoneNumber( request.getPhoneNumber() );
        user.username( request.getUsername() );

        return user.build();
    }

    @Override
    public void updateUser(User user, UpdateUserRequest request) {
        if ( request == null ) {
            return;
        }

        user.setDob( request.getDob() );
        user.setEmail( request.getEmail() );
        user.setFullName( request.getFullName() );
        if ( request.getGender() != null ) {
            user.setGender( Enum.valueOf( Gender.class, request.getGender() ) );
        }
        else {
            user.setGender( null );
        }
        user.setPhoneNumber( request.getPhoneNumber() );
        user.setRole( request.getRole() );
        if ( request.getStatus() != null ) {
            user.setStatus( Enum.valueOf( UserStatus.class, request.getStatus() ) );
        }
        else {
            user.setStatus( null );
        }
    }

    @Override
    public UserResponse toUserResponse(User user) {
        if ( user == null ) {
            return null;
        }

        UserResponse.UserResponseBuilder userResponse = UserResponse.builder();

        userResponse.createdAt( user.getCreatedAt() );
        userResponse.dob( user.getDob() );
        userResponse.email( user.getEmail() );
        userResponse.fullName( user.getFullName() );
        if ( user.getGender() != null ) {
            userResponse.gender( user.getGender().name() );
        }
        userResponse.id( user.getId() );
        userResponse.phoneNumber( user.getPhoneNumber() );
        userResponse.role( user.getRole() );
        userResponse.status( user.getStatus() );
        userResponse.username( user.getUsername() );

        return userResponse.build();
    }
}
