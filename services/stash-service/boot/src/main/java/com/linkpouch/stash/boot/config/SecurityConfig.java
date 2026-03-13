package com.linkpouch.stash.boot.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.linkpouch.stash.infrastructure.adapter.web.HttpCookieOAuth2AuthorizationRequestRepository;
import com.linkpouch.stash.infrastructure.adapter.web.OAuth2AuthenticationFailureHandler;
import com.linkpouch.stash.infrastructure.adapter.web.OAuth2AuthenticationSuccessHandler;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(final HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // MVC interceptors (StashJwtInterceptor, AccountJwtInterceptor) handle auth —
                // Spring Security is only used here for the OAuth2 login flow.
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .oauth2Login(oauth2 -> oauth2.authorizationEndpoint(ep ->
                                ep.authorizationRequestRepository(new HttpCookieOAuth2AuthorizationRequestRepository()))
                        .successHandler(oAuth2AuthenticationSuccessHandler)
                        .failureHandler(oAuth2AuthenticationFailureHandler));
        return http.build();
    }
}
