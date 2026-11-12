package com.ltweb.backend.config;

import com.ltweb.backend.service.DataSeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Configuration
@Profile("dev & !prod")
@ConditionalOnProperty(name = "app.demo.seed-enabled", havingValue = "true")
@RequiredArgsConstructor
public class ApplicationInitConfig {

    private final DataSeedService dataSeedService;

    @Bean
    public ApplicationRunner applicationRunner() {
        return args -> dataSeedService.seedInitialData();
    }
}
