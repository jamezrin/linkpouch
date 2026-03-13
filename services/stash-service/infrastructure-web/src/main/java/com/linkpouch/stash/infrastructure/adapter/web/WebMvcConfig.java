package com.linkpouch.stash.infrastructure.adapter.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final StashJwtInterceptor stashJwtInterceptor;
    private final AccountJwtInterceptor accountJwtInterceptor;

    @Override
    public void addInterceptors(@NonNull final InterceptorRegistry registry) {
        registry.addInterceptor(stashJwtInterceptor)
                .addPathPatterns("/api/stashes/**", "/api/links/**", "/stashes/**", "/links/**");
        registry.addInterceptor(accountJwtInterceptor).addPathPatterns("/account/**");
    }
}
