package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.AccountAiSettingsApi;
import com.linkpouch.stash.api.model.AiSettingsResponseDTO;
import com.linkpouch.stash.api.model.UpsertAiSettingsRequestDTO;
import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;
import com.linkpouch.stash.domain.port.in.DeleteAccountAiSettingsUseCase;
import com.linkpouch.stash.domain.port.in.GetAccountAiSettingsQuery;
import com.linkpouch.stash.domain.port.in.UpsertAccountAiSettingsCommand;
import com.linkpouch.stash.domain.port.in.UpsertAccountAiSettingsUseCase;
import com.linkpouch.stash.domain.service.AccountClaims;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AccountAiSettingsController implements AccountAiSettingsApi {

    private final GetAccountAiSettingsQuery getAccountAiSettingsQuery;
    private final UpsertAccountAiSettingsUseCase upsertAccountAiSettingsUseCase;
    private final DeleteAccountAiSettingsUseCase deleteAccountAiSettingsUseCase;
    private final HttpServletRequest httpRequest;

    @Override
    public ResponseEntity<List<AiSettingsResponseDTO>> getAiSettings() {
        final AccountClaims claims = getClaims();
        final List<AccountAiSettings> settings = getAccountAiSettingsQuery.execute(claims.accountId());
        final List<AiSettingsResponseDTO> response =
                settings.stream().map(this::toDto).toList();
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<AiSettingsResponseDTO> upsertAiSettings(
            final String provider, final UpsertAiSettingsRequestDTO body) {
        final AccountClaims claims = getClaims();
        final AiProvider aiProvider = AiProvider.valueOf(provider);
        final AccountAiSettings saved = upsertAccountAiSettingsUseCase.execute(new UpsertAccountAiSettingsCommand(
                claims.accountId(), aiProvider, body.getApiKey(), body.getModel(), body.getEnabled()));
        return ResponseEntity.ok(toDto(saved));
    }

    @Override
    public ResponseEntity<Void> deleteAiSettings(final String provider) {
        final AccountClaims claims = getClaims();
        deleteAccountAiSettingsUseCase.execute(claims.accountId(), AiProvider.valueOf(provider));
        return ResponseEntity.noContent().build();
    }

    private AiSettingsResponseDTO toDto(final AccountAiSettings settings) {
        return new AiSettingsResponseDTO()
                .provider(AiSettingsResponseDTO.ProviderEnum.fromValue(
                        settings.getProvider().name()))
                .model(settings.getModel())
                .enabled(settings.isEnabled())
                .hasApiKey(settings.getApiKey() != null && !settings.getApiKey().isBlank());
    }

    private AccountClaims getClaims() {
        return (AccountClaims) httpRequest.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
    }
}
