package com.linkpouch.stash.infrastructure.config;

import javax.sql.DataSource;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JooqConfig {

    @Bean
    public DSLContext dslContext(final DataSource dataSource) {
        return DSL.using(dataSource, org.jooq.SQLDialect.POSTGRES);
    }
}
