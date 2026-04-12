package com.cgvptit.movie.mapper;

import com.cgvptit.movie.dto.request.MovieRequest;
import com.cgvptit.movie.dto.response.MovieResponse;
import com.cgvptit.movie.entity.Movie;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface MovieBeanMapper {

	Movie toEntity(MovieRequest request);

	void copyRequestOntoEntity(MovieRequest request, @MappingTarget Movie movie);

	MovieResponse toResponse(Movie movie);
}
