package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ltweb.backend.dto.request.CreateMovieRequest;
import com.ltweb.backend.dto.request.UpdateMovieRequest;
import com.ltweb.backend.dto.response.MovieResponse;
import org.junit.jupiter.api.Test;

class MovieVisibilityJsonTest {
  private final ObjectMapper json = new ObjectMapper();

  @Test
  void createAndUpdateAcceptIsPublicWithoutLosingFalse() throws Exception {
    assertThat(json.readValue("{\"isPublic\":false}", CreateMovieRequest.class).getIsPublic())
        .isFalse();
    assertThat(json.readValue("{\"isPublic\":true}", UpdateMovieRequest.class).getIsPublic())
        .isTrue();
    assertThat(json.readValue("{}", UpdateMovieRequest.class).getIsPublic()).isNull();
  }

  @Test
  void responseUsesIsPublicAndRemovesPublished() throws Exception {
    var response = MovieResponse.builder().isPublic(false).build();
    var node = json.readTree(json.writeValueAsString(response));
    assertThat(node.has("isPublic")).isTrue();
    assertThat(node.get("isPublic").booleanValue()).isFalse();
    assertThat(node.has("published")).isFalse();
  }
}
