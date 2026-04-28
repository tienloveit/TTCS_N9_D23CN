package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.request.CreateMovieRequest;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.dto.response.MovieResponse;
import com.ltweb.backend.entity.Movie;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", uses = GenreMapper.class)
public interface MovieMapper {

  @Mapping(target = "id", ignore = true)
  @Mapping(target = "genres", ignore = true)
  @Mapping(target = "director", ignore = true)
  Movie toMovie(CreateMovieRequest request);

  @Mapping(target = "movieId", source = "id")
  @Mapping(target = "directorId", source = "director.id")
  @Mapping(target = "directorName", source = "director.name")
  @Mapping(target = "averageRating", ignore = true)
  @Mapping(target = "ratingCount", ignore = true)
  MovieResponse toMovieResponse(Movie movie);

  @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
  @Mapping(target = "id", ignore = true)
  @Mapping(target = "genres", ignore = true)
  @Mapping(target = "director", ignore = true)
  void updateMovie(@MappingTarget Movie movie, UpdateMovieRequest request);
}
