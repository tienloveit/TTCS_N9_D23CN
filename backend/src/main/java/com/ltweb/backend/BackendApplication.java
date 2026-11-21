package com.ltweb.backend;

import com.ltweb.backend.config.VnpayProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Schema do Flyway quản lý (src/main/resources/db/migration). Không sửa schema bằng code lúc khởi
 * động: thay đổi cột, ràng buộc hay index phải đi qua một migration mới.
 */
@SpringBootApplication
@EnableConfigurationProperties(VnpayProperties.class)
@EnableScheduling
public class BackendApplication {

  public static void main(String[] args) {
    SpringApplication.run(BackendApplication.class, args);
  }
}
