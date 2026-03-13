package com.linkpouch.stash.infrastructure.adapter.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.linkpouch.stash.domain.service.AccountClaims;
import com.linkpouch.stash.domain.service.AccountTokenService;

import lombok.RequiredArgsConstructor;

/**
 * Spring {@link HandlerInterceptor} that validates Bearer JWTs on all {@code /account/**} endpoints.
 *
 * <p>On success, attaches the validated {@link AccountClaims} to the request attribute
 * {@value CLAIMS_ATTR} for use by {@link AccountController}.
 */
@Component
@RequiredArgsConstructor
public class AccountJwtInterceptor implements HandlerInterceptor {

    public static final String CLAIMS_ATTR = "accountJwtClaims";

    private static final String BEARER_PREFIX = "Bearer ";

    private final AccountTokenService accountTokenService;

    @Override
    public boolean preHandle(
            @NonNull final HttpServletRequest request,
            @NonNull final HttpServletResponse response,
            @NonNull final Object handler) {

        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        final String token;
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            token = authHeader.substring(BEARER_PREFIX.length());
        } else {
            token = null;
        }

        final AccountClaims claims = accountTokenService.validateToken(token);
        request.setAttribute(CLAIMS_ATTR, claims);
        return true;
    }
}
