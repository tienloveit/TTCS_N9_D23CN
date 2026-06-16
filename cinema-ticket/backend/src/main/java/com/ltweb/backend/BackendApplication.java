package com.ltweb.backend;

import com.ltweb.backend.config.VnpayProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.context.annotation.Bean;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.extern.slf4j.Slf4j;

@SpringBootApplication
@EnableConfigurationProperties(VnpayProperties.class)
@EnableScheduling
@Slf4j
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    public CommandLineRunner alterTable(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE bookings MODIFY status VARCHAR(50)");
                log.info("Successfully altered bookings.status to VARCHAR(50)");
            } catch (Exception e) {
                log.warn("Could not alter bookings.status: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("ALTER TABLE bookings MODIFY payment_status VARCHAR(50)");
                log.info("Successfully altered bookings.payment_status to VARCHAR(50)");
            } catch (Exception e) {
                log.warn("Could not alter bookings.payment_status: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("ALTER TABLE users MODIFY role VARCHAR(20)");
                log.info("Successfully altered users.role to VARCHAR(20)");
            } catch (Exception e) {
                log.warn("Could not alter users.role: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN branch_id BIGINT");
                log.info("Successfully added users.branch_id");
            } catch (Exception e) {
                log.warn("Could not add users.branch_id: " + e.getMessage());
            }
            try {
                jdbcTemplate.execute("ALTER TABLE foods ADD COLUMN branch_id BIGINT");
                log.info("Successfully added foods.branch_id");
            } catch (Exception e) {
                log.warn("Could not add foods.branch_id: " + e.getMessage());
            }
        };
    }
}
