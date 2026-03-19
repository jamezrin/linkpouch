package com.linkpouch.stash.infrastructure.adapter.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;
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
                .findByAccountIdAndProvider(
                        settings.getAccountId(), settings.getProvider().name())
                .map(existing -> {
                    existing.setApiKey(settings.getApiKey());
                    existing.setModel(settings.getModel());
                    existing.setEnabled(settings.isEnabled());
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
    public List<AccountAiSettings> findAllByAccountId(final UUID accountId) {
        return jpaRepository.findByAccountId(accountId).stream()
                .map(mapper::mapIn)
                .toList();
    }

    @Override
    public Optional<AccountAiSettings> findByAccountIdAndProvider(final UUID accountId, final AiProvider provider) {
        return jpaRepository
                .findByAccountIdAndProvider(accountId, provider.name())
                .map(mapper::mapIn);
    }

    @Override
    public void deleteByAccountIdAndProvider(final UUID accountId, final AiProvider provider) {
        jpaRepository.deleteByAccountIdAndProvider(accountId, provider.name());
    }
}
