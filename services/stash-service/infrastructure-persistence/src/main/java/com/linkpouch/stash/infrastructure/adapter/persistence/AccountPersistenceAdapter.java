package com.linkpouch.stash.infrastructure.adapter.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.OAuthProvider;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.AccountJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.AccountStashJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountProviderJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountStashId;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountStashJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.AccountEntityMapper;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AccountPersistenceAdapter implements AccountRepository {

    private final AccountJpaRepository accountJpaRepository;
    private final AccountStashJpaRepository accountStashJpaRepository;
    private final AccountEntityMapper accountMapper;

    @Override
    public Account save(final Account account) {
        final Optional<AccountJpaEntity> existingOpt = accountJpaRepository.findByIdWithProviders(account.getId());

        final AccountJpaEntity entity;
        if (existingOpt.isPresent()) {
            entity = existingOpt.get();
            entity.setEmail(account.getEmail());
            entity.setDisplayName(account.getDisplayName());
            entity.setAvatarUrl(account.getAvatarUrl());
            syncProviders(account, entity);
        } else {
            entity = accountMapper.mapOut(account);
        }

        final AccountJpaEntity saved = accountJpaRepository.save(entity);
        return accountMapper.mapIn(saved);
    }

    @Override
    public Optional<Account> findById(final UUID id) {
        return accountJpaRepository.findByIdWithProviders(id).map(accountMapper::mapIn);
    }

    @Override
    public Optional<Account> findByProviderKey(final OAuthProvider provider, final String providerUserId) {
        return accountJpaRepository
                .findByProviders_ProviderAndProviderUserId(provider.name(), providerUserId)
                .map(accountMapper::mapIn);
    }

    @Override
    public List<UUID> findClaimedStashIds(final UUID accountId) {
        return accountStashJpaRepository.findStashIdsByAccountId(accountId);
    }

    @Override
    public void claimStash(final UUID accountId, final UUID stashId) {
        final AccountStashId id = new AccountStashId(accountId, stashId);
        if (!accountStashJpaRepository.existsById(id)) {
            final AccountStashJpaEntity entity =
                    AccountStashJpaEntity.builder().id(id).build();
            accountStashJpaRepository.save(entity);
        }
    }

    @Override
    public void disownStash(final UUID accountId, final UUID stashId) {
        accountStashJpaRepository.deleteById(new AccountStashId(accountId, stashId));
    }

    @Override
    public boolean isStashClaimed(final UUID accountId, final UUID stashId) {
        return accountStashJpaRepository.existsById(new AccountStashId(accountId, stashId));
    }

    private void syncProviders(final Account account, final AccountJpaEntity entity) {
        account.getProviders().forEach(domainProvider -> {
            final boolean alreadyPresent = entity.getProviders().stream()
                    .anyMatch(p ->
                            p.getProvider().equals(domainProvider.provider().name())
                                    && p.getProviderUserId().equals(domainProvider.providerUserId()));
            if (!alreadyPresent) {
                final AccountProviderJpaEntity providerEntity = AccountProviderJpaEntity.builder()
                        .id(domainProvider.id())
                        .account(entity)
                        .provider(domainProvider.provider().name())
                        .providerUserId(domainProvider.providerUserId())
                        .build();
                entity.getProviders().add(providerEntity);
            }
        });
    }
}
