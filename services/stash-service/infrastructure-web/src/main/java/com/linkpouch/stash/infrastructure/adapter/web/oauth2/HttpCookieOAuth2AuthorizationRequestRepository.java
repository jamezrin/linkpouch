package com.linkpouch.stash.infrastructure.adapter.web.oauth2;

import java.util.Base64;
import java.util.Map;
import java.util.Set;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import tools.jackson.databind.ObjectMapper;

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

    private final ObjectMapper objectMapper;

    public HttpCookieOAuth2AuthorizationRequestRepository(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    private record SerializedRequest(
            String authorizationUri,
            String clientId,
            String redirectUri,
            Set<String> scopes,
            String state,
            Map<String, Object> additionalParameters,
            Map<String, Object> attributes,
            String authorizationRequestUri) {}

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(final HttpServletRequest request) {
        final Cookie cookie = findCookie(request, COOKIE_NAME);
        if (cookie == null) return null;
        try {
            final byte[] decoded = Base64.getUrlDecoder().decode(cookie.getValue());
            final SerializedRequest sr = objectMapper.readValue(decoded, SerializedRequest.class);
            return OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri(sr.authorizationUri())
                    .clientId(sr.clientId())
                    .redirectUri(sr.redirectUri())
                    .scopes(sr.scopes())
                    .state(sr.state())
                    .additionalParameters(sr.additionalParameters())
                    .attributes(sr.attributes())
                    .authorizationRequestUri(sr.authorizationRequestUri())
                    .build();
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
        try {
            final SerializedRequest sr = new SerializedRequest(
                    authorizationRequest.getAuthorizationUri(),
                    authorizationRequest.getClientId(),
                    authorizationRequest.getRedirectUri(),
                    authorizationRequest.getScopes(),
                    authorizationRequest.getState(),
                    authorizationRequest.getAdditionalParameters(),
                    authorizationRequest.getAttributes(),
                    authorizationRequest.getAuthorizationRequestUri());
            final byte[] serialized = objectMapper.writeValueAsBytes(sr);
            final String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(serialized);
            final Cookie cookie = new Cookie(COOKIE_NAME, encoded);
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            cookie.setMaxAge(COOKIE_MAX_AGE_SECONDS);
            response.addCookie(cookie);
        } catch (Exception e) {
            deleteCookie(request, response, COOKIE_NAME);
        }
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
