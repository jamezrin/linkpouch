package com.linkpouch.stash.boot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.linkpouch.stash")
@EnableJpaRepositories(basePackages = "com.linkpouch.stash.infrastructure.adapter.persistence.jpa")
@EntityScan(basePackages = "com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity")
@EnableScheduling
public class StashServiceApplication {
    public static void main(final String[] args) {
        SpringApplication.run(StashServiceApplication.class, args);
    }
}
