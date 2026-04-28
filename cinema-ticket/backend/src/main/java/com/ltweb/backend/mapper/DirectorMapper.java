package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.response.DirectorResponse;
import com.ltweb.backend.entity.Director;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DirectorMapper {
  DirectorResponse toDirectorResponse(Director director);
}
