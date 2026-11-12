package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.ltweb.backend.config.ApplicationInitConfig;
import com.ltweb.backend.config.DataSeeder;
import com.ltweb.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;

class DemoSeedConfigurationTest {
    private ApplicationContextRunner context(String profiles, String enabled) {
        ApplicationContextRunner runner = new ApplicationContextRunner()
                .withInitializer(c -> c.getEnvironment().setActiveProfiles(profiles.split(",")))
                .withUserConfiguration(ApplicationInitConfig.class, DataSeeder.class)
                .withBean(DataSeedService.class, () -> mock(DataSeedService.class))
                .withBean(ShowtimeRepository.class, () -> mock(ShowtimeRepository.class))
                .withBean(BookingRepository.class, () -> mock(BookingRepository.class))
                .withBean(TicketRepository.class, () -> mock(TicketRepository.class))
                .withBean(MovieRepository.class, () -> mock(MovieRepository.class))
                .withBean(RoomRepository.class, () -> mock(RoomRepository.class))
                .withBean(SeatRepository.class, () -> mock(SeatRepository.class))
                .withBean(UserRepository.class, () -> mock(UserRepository.class))
                .withBean(FoodRepository.class, () -> mock(FoodRepository.class))
                .withBean(JdbcTemplate.class, () -> mock(JdbcTemplate.class));
        return enabled.equals("missing") ? runner
                : runner.withPropertyValues("app.demo.seed-enabled=" + enabled);
    }

    @ParameterizedTest
    @CsvSource({"default,true", "prod,true", "'dev,prod',true", "dev,false", "dev,missing"})
    void seedRunnersStayOffWithoutBothDevelopmentAndExplicitOptIn(String profiles, String enabled) {
        context(profiles, enabled).run(c -> {
            assertThat(c).doesNotHaveBean(ApplicationInitConfig.class).doesNotHaveBean(DataSeeder.class);
            assertThat(c.getBeansOfType(ApplicationRunner.class)).isEmpty();
            verifyNoInteractions(c.getBean(DataSeedService.class), c.getBean(BookingRepository.class),
                    c.getBean(ShowtimeRepository.class));
            assertThat(mockingDetails(c.getBean(JdbcTemplate.class)).getInvocations())
                    .allMatch(invocation -> invocation.getMethod().getName().equals("afterPropertiesSet"));
        });
    }

    @Test void demoSeedRunsOnlyWhenExplicitlyEnabledInDevelopment() {
        context("dev", "true").run(c -> {
            assertThat(c).hasSingleBean(ApplicationInitConfig.class).hasSingleBean(DataSeeder.class);
            c.getBean(ApplicationRunner.class).run(null);
            verify(c.getBean(DataSeedService.class)).seedInitialData();
        });
    }
}
