package com.linkpouch.stash.application.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;
import com.linkpouch.stash.domain.port.in.DeleteAccountAiSettingsUseCase;
import com.linkpouch.stash.domain.port.in.GetAccountAiSettingsQuery;
import com.linkpouch.stash.domain.port.in.UpsertAccountAiSettingsCommand;
import com.linkpouch.stash.domain.port.in.UpsertAccountAiSettingsUseCase;
import com.linkpouch.stash.domain.port.outbound.AccountAiSettingsRepository;

import lombok.RequiredArgsConstructor;

@UseCase
@RequiredArgsConstructor
public class AccountAiSettingsService
        implements GetAccountAiSettingsQuery, UpsertAccountAiSettingsUseCase, DeleteAccountAiSettingsUseCase {

    private final AccountAiSettingsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<AccountAiSettings> execute(final UUID accountId) {
        return repository.findAllByAccountId(accountId);
    }

    @Override
    @Transactional
    public AccountAiSettings execute(final UpsertAccountAiSettingsCommand command) {
        final Optional<AccountAiSettings> existing =
                repository.findByAccountIdAndProvider(command.accountId(), command.provider());

        if (existing.isPresent()) {
            final AccountAiSettings settings = existing.get();
            // Preserve existing api_key when null is passed (masked on client)
            final String apiKey = command.apiKey() != null ? command.apiKey() : settings.getApiKey();
            settings.update(apiKey, command.model(), command.enabled());
            return repository.save(settings);
        }

        final AccountAiSettings settings = AccountAiSettings.create(
                command.accountId(), command.provider(), command.apiKey(), command.model(), command.enabled());
        return repository.save(settings);
    }

    @Override
    @Transactional
    public void execute(final UUID accountId, final AiProvider provider) {
        repository.deleteByAccountIdAndProvider(accountId, provider);
    }
}
