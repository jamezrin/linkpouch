package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.model.AccountProxySettings;
import com.linkpouch.stash.domain.port.in.GetAccountProxySettingsQuery;
import com.linkpouch.stash.domain.port.in.UpsertAccountProxySettingsCommand;
import com.linkpouch.stash.domain.port.in.UpsertAccountProxySettingsUseCase;
import com.linkpouch.stash.domain.port.outbound.AccountProxySettingsRepository;

import lombok.RequiredArgsConstructor;

@UseCase
@RequiredArgsConstructor
public class AccountProxySettingsService implements GetAccountProxySettingsQuery, UpsertAccountProxySettingsUseCase {

    private final AccountProxySettingsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public Optional<AccountProxySettings> execute(final UUID accountId) {
        return repository.findByAccountId(accountId);
    }

    @Override
    @Transactional
    public AccountProxySettings execute(final UpsertAccountProxySettingsCommand command) {
        final Optional<AccountProxySettings> existing = repository.findByAccountId(command.accountId());

        if (existing.isPresent()) {
            final AccountProxySettings settings = existing.get();
            settings.update(command.proxyCountry());
            return repository.save(settings);
        }

        return repository.save(AccountProxySettings.create(command.accountId(), command.proxyCountry()));
    }
}
