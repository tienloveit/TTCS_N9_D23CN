package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.Entity;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.orm.jpa.hibernate.SpringImplicitNamingStrategy;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/**
 * Kiểm tra mọi JPQL trong {@code @Query} của repository dựa trên metamodel thật của entity, không
 * cần MySQL. Lỗi sai tên thuộc tính, đường join hoặc kiểu so sánh lộ ra ở đây thay vì lúc khởi động
 * backend. Không kiểm tra được kết quả dữ liệu; phần đó cần test persistence trên bản sao MySQL.
 */
class RepositoryQueryValidationTest {
  private static final String BASE_PACKAGE = "com.ltweb.backend";

  private static StandardServiceRegistry registry;
  private static SessionFactory sessionFactory;

  @BeforeAll
  static void bootHibernateWithoutDatabase() throws ClassNotFoundException {
    registry =
        new StandardServiceRegistryBuilder()
            .applySettings(
                Map.of(
                    "hibernate.dialect", "org.hibernate.dialect.MySQLDialect",
                    "hibernate.boot.allow_jdbc_metadata_access", "false",
                    "hibernate.hbm2ddl.auto", "none"))
            .build();
    MetadataSources sources = new MetadataSources(registry);
    for (Class<?> entity : scan(new AnnotationTypeFilter(Entity.class), BASE_PACKAGE + ".entity")) {
      sources.addAnnotatedClass(entity);
    }
    sessionFactory =
        sources
            .getMetadataBuilder()
            .applyPhysicalNamingStrategy(new CamelCaseToUnderscoresNamingStrategy())
            .applyImplicitNamingStrategy(new SpringImplicitNamingStrategy())
            .build()
            .buildSessionFactory();
  }

  @AfterAll
  static void close() {
    if (sessionFactory != null) {
      sessionFactory.close();
    }
    StandardServiceRegistryBuilder.destroy(registry);
  }

  @Test
  void everyRepositoryJpqlQueryMatchesTheEntityModel() throws ClassNotFoundException {
    List<String> failures = new ArrayList<>();
    int checked = 0;
    try (var session = sessionFactory.openSession()) {
      for (Class<?> repository : repositories()) {
        for (Method method : repository.getDeclaredMethods()) {
          Query query = method.getAnnotation(Query.class);
          if (query == null || query.nativeQuery() || query.value().contains("#{")) {
            continue;
          }
          String jpql = query.value().strip();
          try {
            if (isMutation(jpql)) {
              session.createMutationQuery(jpql);
            } else {
              session.createQuery(jpql, Object.class);
            }
            checked++;
          } catch (RuntimeException ex) {
            failures.add(repository.getSimpleName() + "." + method.getName() + ": " + ex);
          }
        }
      }
    }
    assertThat(failures).isEmpty();
    assertThat(checked).isPositive();
  }

  private static boolean isMutation(String jpql) {
    String head = jpql.toLowerCase();
    return head.startsWith("update") || head.startsWith("delete");
  }

  private static List<Class<?>> repositories() throws ClassNotFoundException {
    return scan(new AssignableTypeFilter(Repository.class), BASE_PACKAGE + ".repository");
  }

  private static List<Class<?>> scan(
      org.springframework.core.type.filter.TypeFilter filter, String basePackage)
      throws ClassNotFoundException {
    var scanner =
        new ClassPathScanningCandidateComponentProvider(false) {
          @Override
          protected boolean isCandidateComponent(
              org.springframework.beans.factory.annotation.AnnotatedBeanDefinition definition) {
            return true;
          }
        };
    scanner.addIncludeFilter(filter);
    List<Class<?>> classes = new ArrayList<>();
    for (BeanDefinition definition : scanner.findCandidateComponents(basePackage)) {
      classes.add(Class.forName(definition.getBeanClassName()));
    }
    return classes;
  }
}
