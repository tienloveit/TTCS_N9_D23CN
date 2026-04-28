package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.CreateDirectorRequest;
import com.ltweb.backend.dto.request.UpdateDirectorRequest;
import com.ltweb.backend.dto.response.DirectorResponse;
import com.ltweb.backend.entity.Director;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.DirectorMapper;
import com.ltweb.backend.repository.DirectorRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class DirectorService {
  private final DirectorRepository directorRepository;
  private final DirectorMapper directorMapper;

  @Transactional(readOnly = true)
  public List<DirectorResponse> getAllDirectors() {
    return directorRepository.findAll().stream()
        .map(directorMapper::toDirectorResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public DirectorResponse getDirectorById(Long id) {
    return directorMapper.toDirectorResponse(getDirector(id));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public DirectorResponse createDirector(CreateDirectorRequest request) {
    Director director =
        Director.builder().name(request.getName().trim()).bio(trimToNull(request.getBio())).build();
    return directorMapper.toDirectorResponse(directorRepository.save(director));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public DirectorResponse updateDirector(Long id, UpdateDirectorRequest request) {
    Director director = getDirector(id);
    if (StringUtils.hasText(request.getName())) {
      director.setName(request.getName().trim());
    }
    if (request.getBio() != null) {
      director.setBio(trimToNull(request.getBio()));
    }
    return directorMapper.toDirectorResponse(directorRepository.save(director));
  }

  @PreAuthorize("hasRole('ADMIN')")
  @Transactional
  public void deleteDirector(Long id) {
    directorRepository.delete(getDirector(id));
  }

  private Director getDirector(Long id) {
    return directorRepository
        .findById(id)
        .orElseThrow(() -> new AppException(ErrorCode.DIRECTOR_NOT_FOUND));
  }

  private String trimToNull(String value) {
    return StringUtils.hasText(value) ? value.trim() : null;
  }
}
