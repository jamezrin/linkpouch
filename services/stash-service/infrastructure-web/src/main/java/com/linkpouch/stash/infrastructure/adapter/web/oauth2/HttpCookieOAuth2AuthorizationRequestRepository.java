package com.linkpouch.stash.infrastructure.adapter.web.oauth2;

import java.util.Base64;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.util.SerializationUtils;

/**
 * Stores the OAuth2 authorization request in a short-lived cookie instead of the HTTP session.
 *
 * <p>This keeps the stash-service stateless: no session affinity is required when running
 * multiple replicas behind a load-balancer.
 */
public class HttpCookieOAuth2AuthorizationRequestRepository
        implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    private static final String COOKIE_NAME = "oauth2_auth_request";
    private static final int COOKIE_MAX_AGE_SECONDS = 180;

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(final HttpServletRequest request) {
        final Cookie cookie = findCookie(request, COOKIE_NAME);
        if (cookie == null) return null;
        try {
            final byte[] decoded = Base64.getUrlDecoder().decode(cookie.getValue());
            return (OAuth2AuthorizationRequest) SerializationUtils.deserialize(decoded);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void saveAuthorizationRequest(
            final OAuth2AuthorizationRequest authorizationRequest,
            final HttpServletRequest request,
            final HttpServletResponse response) {
        if (authorizationRequest == null) {
            deleteCookie(request, response, COOKIE_NAME);
            return;
        }
        final byte[] serialized = SerializationUtils.serialize(authorizationRequest);
        final String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(serialized);
        final Cookie cookie = new Cookie(COOKIE_NAME, encoded);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(COOKIE_MAX_AGE_SECONDS);
        response.addCookie(cookie);
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(
            final HttpServletRequest request, final HttpServletResponse response) {
        final OAuth2AuthorizationRequest authRequest = loadAuthorizationRequest(request);
        deleteCookie(request, response, COOKIE_NAME);
        return authRequest;
    }

    private Cookie findCookie(final HttpServletRequest request, final String name) {
        final Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (final Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) return cookie;
        }
        return null;
    }

    private void deleteCookie(final HttpServletRequest request, final HttpServletResponse response, final String name) {
        final Cookie cookie = findCookie(request, name);
        if (cookie != null) {
            cookie.setValue("");
            cookie.setPath("/");
            cookie.setMaxAge(0);
            response.addCookie(cookie);
        }
    }
}
