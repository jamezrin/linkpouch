package com.linkpouch.stash.infrastructure.adapter.web.controller;

import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;

import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.AccountProxySettingsApi;
import com.linkpouch.stash.api.model.ProxySettingsResponseDTO;
import com.linkpouch.stash.api.model.UpsertProxySettingsRequestDTO;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.AccountProxySettings;
import com.linkpouch.stash.domain.port.in.GetAccountProxySettingsQuery;
import com.linkpouch.stash.domain.port.in.UpsertAccountProxySettingsCommand;
import com.linkpouch.stash.domain.port.in.UpsertAccountProxySettingsUseCase;
import com.linkpouch.stash.domain.service.AccountClaims;
import com.linkpouch.stash.infrastructure.adapter.web.interceptor.AccountJwtInterceptor;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AccountProxySettingsController implements AccountProxySettingsApi {

    private final GetAccountProxySettingsQuery getAccountProxySettingsQuery;
    private final UpsertAccountProxySettingsUseCase upsertAccountProxySettingsUseCase;
    private final HttpServletRequest httpRequest;

    @Override
    public ResponseEntity<ProxySettingsResponseDTO> getProxySettings() {
        final AccountClaims claims = getClaims();
        final Optional<AccountProxySettings> settings = getAccountProxySettingsQuery.execute(claims.accountId());
        return settings.map(s -> ResponseEntity.ok(toDto(s)))
                .orElseThrow(() -> new NotFoundException("No proxy settings configured"));
    }

    @Override
    public ResponseEntity<ProxySettingsResponseDTO> upsertProxySettings(final UpsertProxySettingsRequestDTO body) {
        final AccountClaims claims = getClaims();
        final JsonNullable<String> proxyCountryNullable = body.getProxyCountry();
        final String proxyCountry = proxyCountryNullable.isPresent() ? proxyCountryNullable.get() : null;
        final AccountProxySettings saved = upsertAccountProxySettingsUseCase.execute(
                new UpsertAccountProxySettingsCommand(claims.accountId(), proxyCountry));
        return ResponseEntity.ok(toDto(saved));
    }

    private ProxySettingsResponseDTO toDto(final AccountProxySettings settings) {
        return new ProxySettingsResponseDTO().proxyCountry(settings.getProxyCountry());
    }

    private AccountClaims getClaims() {
        final AccountClaims claims = (AccountClaims) httpRequest.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        if (claims == null) {
            throw new UnauthorizedException("Missing authentication claims");
        }
        return claims;
    }
}
