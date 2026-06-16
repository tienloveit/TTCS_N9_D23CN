package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.response.GenreResponse;
import com.ltweb.backend.entity.Genre;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface GenreMapper {

    GenreResponse toGenreResponse(Genre genre);
}
