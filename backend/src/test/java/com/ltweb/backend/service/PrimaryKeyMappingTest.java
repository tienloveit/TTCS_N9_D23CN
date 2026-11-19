package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

class PrimaryKeyMappingTest {
  @Test
  void allJpaEntityPrimaryKeysUsePhysicalColumnId() throws ClassNotFoundException {
    var scanner = new ClassPathScanningCandidateComponentProvider(false);
    scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
    var entities = scanner.findCandidateComponents("com.ltweb.backend.entity");
    assertThat(entities).isNotEmpty();
    for (var definition : entities) {
      Class<?> entity = Class.forName(definition.getBeanClassName());
      var ids =
          Arrays.stream(entity.getDeclaredFields())
              .filter(field -> field.isAnnotationPresent(Id.class))
              .toList();
      assertThat(ids).as("Single primary key for %s", entity.getSimpleName()).hasSize(1);
      var field = ids.getFirst();
      Column column = field.getAnnotation(Column.class);
      String physicalName =
          column == null || column.name().isBlank() ? field.getName() : column.name();
      assertThat(physicalName)
          .as("Primary key column of %s", entity.getSimpleName())
          .isEqualTo("id");
    }
  }
}
