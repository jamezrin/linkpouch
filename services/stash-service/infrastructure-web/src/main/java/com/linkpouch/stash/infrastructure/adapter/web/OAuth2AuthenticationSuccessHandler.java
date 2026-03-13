package com.linkpouch.stash.infrastructure.adapter.web;

import java.io.IOException;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.OAuthProvider;
import com.linkpouch.stash.domain.port.in.UpsertAccountCommand;
import com.linkpouch.stash.domain.port.in.UpsertAccountUseCase;
import com.linkpouch.stash.domain.service.AccountTokenService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UpsertAccountUseCase upsertAccountUseCase;
    private final AccountTokenService accountTokenService;

    @Value("${linkpouch.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            final HttpServletRequest request, final HttpServletResponse response, final Authentication authentication)
            throws IOException {

        final OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        final OAuth2User oauthUser = oauthToken.getPrincipal();
        final String registrationId = oauthToken.getAuthorizedClientRegistrationId();

        final UpsertAccountCommand command = buildCommand(registrationId, oauthUser.getAttributes());
        final Account account = upsertAccountUseCase.execute(command);
        final String jwt = accountTokenService.issueToken(account);

        final String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/account")
                .queryParam("token", jwt)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }

    private UpsertAccountCommand buildCommand(final String registrationId, final Map<String, Object> attrs) {
        return switch (registrationId) {
            case "github" ->
                new UpsertAccountCommand(
                        OAuthProvider.GITHUB,
                        String.valueOf(attrs.get("id")),
                        (String) attrs.get("email"),
                        (String) attrs.getOrDefault("name", attrs.get("login")),
                        (String) attrs.get("avatar_url"));
            case "google" ->
                new UpsertAccountCommand(
                        OAuthProvider.GOOGLE,
                        (String) attrs.get("sub"),
                        (String) attrs.get("email"),
                        (String) attrs.get("name"),
                        (String) attrs.get("picture"));
            case "twitter" -> {
                @SuppressWarnings("unchecked")
                final Map<String, Object> data = (Map<String, Object>) attrs.get("data");
                final Map<String, Object> source = data != null ? data : attrs;
                yield new UpsertAccountCommand(
                        OAuthProvider.TWITTER,
                        String.valueOf(source.get("id")),
                        null,
                        (String) source.get("username"),
                        (String) source.get("profile_image_url"));
            }
            case "discord" -> {
                final String discordId = String.valueOf(attrs.get("id"));
                final String avatar = (String) attrs.get("avatar");
                final String avatarUrl = avatar != null
                        ? "https://cdn.discordapp.com/avatars/" + discordId + "/" + avatar + ".png"
                        : null;
                yield new UpsertAccountCommand(
                        OAuthProvider.DISCORD,
                        discordId,
                        (String) attrs.get("email"),
                        (String) attrs.get("username"),
                        avatarUrl);
            }
            default -> throw new IllegalArgumentException("Unknown OAuth provider: " + registrationId);
        };
    }
}
