package com.linkpouch.stash.boot.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {
    // Spring Boot auto-configures RedisCacheManager from application.properties.
    // This class exists solely to host @EnableCaching.
}
