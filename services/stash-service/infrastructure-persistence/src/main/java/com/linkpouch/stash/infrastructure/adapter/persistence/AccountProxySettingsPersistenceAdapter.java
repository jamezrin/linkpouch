package com.linkpouch.stash.infrastructure.adapter.persistence;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.AccountProxySettings;
import com.linkpouch.stash.domain.port.outbound.AccountProxySettingsRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.AccountProxySettingsJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountProxySettingsJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.AccountProxySettingsEntityMapper;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AccountProxySettingsPersistenceAdapter implements AccountProxySettingsRepository {

    private final AccountProxySettingsJpaRepository jpaRepository;
    private final AccountProxySettingsEntityMapper mapper;

    @Override
    public AccountProxySettings save(final AccountProxySettings settings) {
        final AccountProxySettingsJpaEntity entity = jpaRepository
                .findByAccountId(settings.getAccountId())
                .map(existing -> {
                    existing.setProxyCountry(settings.getProxyCountry());
                    return existing;
                })
                .orElseGet(() -> {
                    final AccountProxySettingsJpaEntity newEntity = mapper.mapOut(settings);
                    newEntity.setId(settings.getId());
                    return newEntity;
                });
        return mapper.mapIn(jpaRepository.save(entity));
    }

    @Override
    public Optional<AccountProxySettings> findByAccountId(final UUID accountId) {
        return jpaRepository.findByAccountId(accountId).map(mapper::mapIn);
    }
}
