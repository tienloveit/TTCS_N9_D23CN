package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateGenreRequest;
import com.ltweb.backend.dto.request.UpdateGenreRequest;
import com.ltweb.backend.dto.response.GenreResponse;
import com.ltweb.backend.entity.Genre;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.GenreRepository;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GenreService {
  private final GenreRepository genreRepository;

  @PreAuthorize("hasRole('ADMIN')")
  public GenreResponse createGenre(CreateGenreRequest createGenreRequest) {
    Genre genre = new Genre();
    genre.setName(createGenreRequest.getName());
    return toGenreResponse(genreRepository.save(genre));
  }

  public List<GenreResponse> getAllGenres() {
    return genreRepository.findAll().stream().map(this::toGenreResponse).toList();
  }

  public GenreResponse getGenreById(Long genreId) {
    Genre genre =
        genreRepository
            .findById(genreId)
            .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));
    return toGenreResponse(genre);
  }

  @PreAuthorize("hasRole('ADMIN')")
  public GenreResponse updateGenre(Long genreId, UpdateGenreRequest request) {
    Genre genre =
        genreRepository
            .findById(genreId)
            .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));

    if (request.getName() != null && !request.getName().isBlank()) {
      genre.setName(request.getName());
    }

    return toGenreResponse(genreRepository.save(genre));
  }

  @PreAuthorize("hasRole('ADMIN')")
  public void deleteGenre(Long genreId) {
    Genre genre =
        genreRepository
            .findById(genreId)
            .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));
    genreRepository.delete(genre);
  }

  public Set<Genre> getGenresByIds(Set<Long> genreIds) {
    return genreRepository.findAllById(genreIds).stream().collect(Collectors.toSet());
  }

  private GenreResponse toGenreResponse(Genre genre) {
    return GenreResponse.builder().id(genre.getId()).name(genre.getName()).build();
  }
}
