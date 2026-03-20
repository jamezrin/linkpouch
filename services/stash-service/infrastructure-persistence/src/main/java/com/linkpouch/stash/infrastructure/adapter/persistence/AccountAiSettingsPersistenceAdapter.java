package com.linkpouch.stash.infrastructure.adapter.persistence;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.port.outbound.AccountAiSettingsRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.AccountAiSettingsJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountAiSettingsJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.AccountAiSettingsEntityMapper;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AccountAiSettingsPersistenceAdapter implements AccountAiSettingsRepository {

    private final AccountAiSettingsJpaRepository jpaRepository;
    private final AccountAiSettingsEntityMapper mapper;

    @Override
    public AccountAiSettings save(final AccountAiSettings settings) {
        final AccountAiSettingsJpaEntity entity = jpaRepository
                .findByAccountId(settings.getAccountId())
                .map(existing -> {
                    existing.setApiKey(settings.getApiKey());
                    existing.setModel(settings.getModel());
                    existing.setProvider(settings.getProvider().name());
                    existing.setCustomPrompt(settings.getCustomPrompt());
                    return existing;
                })
                .orElseGet(() -> {
                    final AccountAiSettingsJpaEntity newEntity = mapper.mapOut(settings);
                    newEntity.setId(settings.getId());
                    return newEntity;
                });
        return mapper.mapIn(jpaRepository.save(entity));
    }

    @Override
    public Optional<AccountAiSettings> findByAccountId(final UUID accountId) {
        return jpaRepository.findByAccountId(accountId).map(mapper::mapIn);
    }
}
