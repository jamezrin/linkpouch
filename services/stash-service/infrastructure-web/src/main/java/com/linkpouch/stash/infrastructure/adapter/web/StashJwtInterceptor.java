package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.linkpouch.stash.domain.service.StashAccessClaims;
import com.linkpouch.stash.domain.service.StashTokenService;

import lombok.RequiredArgsConstructor;

/**
 * Spring {@link HandlerInterceptor} that validates Bearer JWTs on all stash/link data endpoints.
 *
 * <p>Extracts the token from {@code Authorization: Bearer {jwt}} or the {@code ?token=} query
 * parameter (the latter supports {@code <img src>} use cases where request headers cannot be set).
 *
 * <p>On success, attaches the validated {@link StashAccessClaims} to the request attribute
 * {@value CLAIMS_ATTR} for use by controllers that need to check the {@code pwdKey} claim.
 *
 * <p>The following paths are skipped because they use signature-based auth instead:
 * <ul>
 *   <li>{@code POST /stashes} — no auth required (creates a new stash)</li>
 *   <li>{@code POST /stashes/{id}/access-token} — exchanges signature for a JWT</li>
 *   <li>{@code PUT /stashes/{id}/password} — signature + optional Bearer</li>
 *   <li>{@code DELETE /stashes/{id}/password} — signature + Bearer (handled in controller)</li>
 *   <li>{@code POST /stashes/{id}/sse-ticket} — (FUTURE: will be migrated; skip for now)</li>
 * </ul>
 *
 * <p>The {@code pwdKey} claim is NOT validated here — that requires loading the stash from DB
 * and is performed by the individual controllers after they load the stash.
 */
@Component
@RequiredArgsConstructor
public class StashJwtInterceptor implements HandlerInterceptor {

    public static final String CLAIMS_ATTR = "stashJwtClaims";

    private static final String BEARER_PREFIX = "Bearer ";
    private static final Pattern STASH_ID_PATTERN =
            Pattern.compile("^/(?:api/)?stashes/([0-9a-fA-F-]{36})(?:/|$)");

    private final StashTokenService tokenService;

    @Override
    public boolean preHandle(
            @NonNull final HttpServletRequest request,
            @NonNull final HttpServletResponse response,
            @NonNull final Object handler) {

        final String method = request.getMethod();
        final String path = request.getRequestURI();

        if (isExcluded(method, path)) {
            return true;
        }

        final UUID stashId = extractStashId(path);
        if (stashId == null) {
            // No stash ID in path — not a stash-scoped endpoint; skip
            return true;
        }

        final String token = extractToken(request);
        final StashAccessClaims claims = tokenService.validateToken(token, stashId);
        request.setAttribute(CLAIMS_ATTR, claims);
        return true;
    }

    private boolean isExcluded(final String method, final String path) {
        // POST /stashes — create stash (no auth)
        if ("POST".equals(method) && path.matches("^/(?:api/)?stashes/?$")) {
            return true;
        }
        // POST /stashes/{id}/access-token — acquire JWT
        if ("POST".equals(method) && path.matches("^/(?:api/)?stashes/[^/]+/access-token$")) {
            return true;
        }
        // PUT /stashes/{id}/password — set/change password
        if ("PUT".equals(method) && path.matches("^/(?:api/)?stashes/[^/]+/password$")) {
            return true;
        }
        // DELETE /stashes/{id}/password — remove password (controller does its own JWT check)
        if ("DELETE".equals(method) && path.matches("^/(?:api/)?stashes/[^/]+/password$")) {
            return true;
        }
        // POST /stashes/{id}/sse-ticket — signature-based, migrated separately
        if ("POST".equals(method) && path.matches("^/(?:api/)?stashes/[^/]+/sse-ticket$")) {
            return true;
        }
        // Internal indexer callbacks on /links/{id}/metadata, /screenshot, /status
        if (path.matches("^/(?:api/)?links/[^/]+/.*$")) {
            return true;
        }
        return false;
    }

    private UUID extractStashId(final String path) {
        final Matcher m = STASH_ID_PATTERN.matcher(path);
        if (!m.find()) return null;
        try {
            return UUID.fromString(m.group(1));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String extractToken(final HttpServletRequest request) {
        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        // Fallback for <img src="...?token=..."> use cases (screenshots)
        return request.getParameter("token");
    }
}
