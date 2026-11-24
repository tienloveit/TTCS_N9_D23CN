package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateUserRequest;
import com.ltweb.backend.dto.request.UpdateProfileRequest;
import com.ltweb.backend.dto.request.UpdateUserRequest;
import com.ltweb.backend.dto.response.UserResponse;
import com.ltweb.backend.entity.User;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface UserMapper {
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "role", ignore = true)
  @Mapping(target = "status", ignore = true)
  @Mapping(target = "createdAt", ignore = true)
  @Mapping(target = "updatedAt", ignore = true)
  @Mapping(target = "bookings", ignore = true)
  @Mapping(target = "password", ignore = true)
  @Mapping(target = "membershipTier", ignore = true)
  @Mapping(target = "totalSpending", ignore = true)
  User toUser(CreateUserRequest request);

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "username", ignore = true)
  @Mapping(target = "createdAt", ignore = true)
  @Mapping(target = "updatedAt", ignore = true)
  @Mapping(target = "bookings", ignore = true)
  @Mapping(target = "authorities", ignore = true)
  @Mapping(target = "password", ignore = true)
  @Mapping(target = "membershipTier", ignore = true)
  @Mapping(target = "totalSpending", ignore = true)
  void updateUser(@MappingTarget User user, UpdateUserRequest request);

  @BeanMapping(
      ignoreByDefault = true,
      nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  @Mapping(target = "fullName", source = "fullName")
  @Mapping(target = "dob", source = "dob")
  @Mapping(target = "phoneNumber", source = "phoneNumber", qualifiedByName = "emptyToNull")
  @Mapping(target = "gender", source = "gender")
  @Mapping(target = "email", source = "email", qualifiedByName = "emptyToNull")
  void updateProfile(@MappingTarget User user, UpdateProfileRequest request);

  // The unique columns allow multiple NULLs when users clear their contact details.
  @Named("emptyToNull")
  default String emptyToNull(String value) {
    return "".equals(value) ? null : value;
  }

  UserResponse toUserResponse(User user);
}
