package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.RegexPatternTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.ClassUtils;

/**
 * Role được kiểm bằng {@code @PreAuthorize} trên controller, service chỉ kiểm chủ sở hữu và chi
 * nhánh. Nhờ vậy quyền của một endpoint đọc được ở đúng một chỗ, khớp với docs/04-api/endpoints.md.
 */
class RoleCheckPlacementTest {
  @Test
  void servicesLeaveRoleChecksToControllers() throws ClassNotFoundException {
    var scanner = new ClassPathScanningCandidateComponentProvider(false);
    scanner.addIncludeFilter(new RegexPatternTypeFilter(java.util.regex.Pattern.compile(".*")));
    List<String> offenders = new ArrayList<>();
    for (var candidate : scanner.findCandidateComponents("com.ltweb.backend.service")) {
      Class<?> type =
          ClassUtils.forName(
              java.util.Objects.requireNonNull(candidate.getBeanClassName()),
              getClass().getClassLoader());
      if (type.isAnnotationPresent(PreAuthorize.class)) offenders.add(type.getSimpleName());
      Arrays.stream(type.getDeclaredMethods())
          .filter(method -> method.isAnnotationPresent(PreAuthorize.class))
          .map(Method::getName)
          .forEach(name -> offenders.add(type.getSimpleName() + "." + name));
    }
    assertThat(offenders).isEmpty();
  }
}
