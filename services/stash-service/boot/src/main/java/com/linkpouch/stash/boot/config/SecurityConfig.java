package com.linkpouch.stash.boot.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestCustomizers;
import org.springframework.security.web.SecurityFilterChain;

import com.linkpouch.stash.infrastructure.adapter.web.oauth2.HttpCookieOAuth2AuthorizationRequestRepository;
import com.linkpouch.stash.infrastructure.adapter.web.oauth2.OAuth2AuthenticationFailureHandler;
import com.linkpouch.stash.infrastructure.adapter.web.oauth2.OAuth2AuthenticationSuccessHandler;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;
    private final ClientRegistrationRepository clientRegistrationRepository;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain filterChain(final HttpSecurity http) throws Exception {
        final DefaultOAuth2AuthorizationRequestResolver authRequestResolver =
                new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, "/oauth2/authorization");
        authRequestResolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // MVC interceptors (StashJwtInterceptor, AccountJwtInterceptor) handle auth —
                // Spring Security is only used here for the OAuth2 login flow.
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .oauth2Login(oauth2 -> oauth2.authorizationEndpoint(ep -> ep.authorizationRequestRepository(
                                        new HttpCookieOAuth2AuthorizationRequestRepository(objectMapper))
                                .authorizationRequestResolver(authRequestResolver))
                        .successHandler(oAuth2AuthenticationSuccessHandler)
                        .failureHandler(oAuth2AuthenticationFailureHandler));
        return http.build();
    }
}
