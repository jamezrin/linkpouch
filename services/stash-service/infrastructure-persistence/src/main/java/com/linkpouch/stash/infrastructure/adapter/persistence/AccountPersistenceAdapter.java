package com.linkpouch.stash.infrastructure.adapter.persistence;

import static com.linkpouch.stash.infrastructure.jooq.generated.Tables.STASHES;

import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.SortField;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.ClaimedStashSummary;
import com.linkpouch.stash.domain.model.OAuthProvider;
import com.linkpouch.stash.domain.model.StashVisibility;
import com.linkpouch.stash.domain.port.in.ListClaimedStashesCommand;
import com.linkpouch.stash.domain.port.in.PagedResult;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.AccountJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.AccountStashJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.StashJpaRepository;
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
    private final StashJpaRepository stashJpaRepository;
    private final AccountEntityMapper accountMapper;
    private final DSLContext dsl;

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
            final AccountStashJpaEntity entity = AccountStashJpaEntity.builder()
                    .id(id)
                    .account(accountJpaRepository.getReferenceById(accountId))
                    .stash(stashJpaRepository.getReferenceById(stashId))
                    .build();
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

    @Override
    public boolean isStashClaimedByAnyone(final UUID stashId) {
        return accountStashJpaRepository.existsByIdStashId(stashId);
    }

    @Override
    public Optional<UUID> findClaimerAccountId(final UUID stashId) {
        return accountStashJpaRepository.findClaimerAccountId(stashId);
    }

    @Override
    public PagedResult<ClaimedStashSummary> listClaimedStashes(final ListClaimedStashesCommand command) {
        final var accountStashes = DSL.table(DSL.name("account_stashes"));
        final var accountIdField = DSL.field(DSL.name("account_stashes", "account_id"), UUID.class);
        final var stashIdField = DSL.field(DSL.name("account_stashes", "stash_id"), UUID.class);
        final var visibilityField = DSL.field(DSL.name("stashes", "visibility"), String.class);

        Condition conditions = accountIdField.eq(command.accountId());
        if (command.search() != null && !command.search().isBlank()) {
            conditions = conditions.and(
                    STASHES.NAME.likeIgnoreCase("%" + command.search().trim() + "%"));
        }

        final SortField<?> orderBy =
                switch (command.sort()) {
                    case "name" -> command.dir().equals("desc") ? STASHES.NAME.desc() : STASHES.NAME.asc();
                    case "updatedAt" ->
                        command.dir().equals("desc") ? STASHES.UPDATED_AT.desc() : STASHES.UPDATED_AT.asc();
                    default -> command.dir().equals("desc") ? STASHES.CREATED_AT.desc() : STASHES.CREATED_AT.asc();
                };

        final int offset = command.page() * command.size();
        final int total = dsl.fetchCount(dsl.select()
                .from(accountStashes)
                .join(STASHES)
                .on(stashIdField.eq(STASHES.ID))
                .where(conditions));

        final List<ClaimedStashSummary> content = dsl.select(
                        STASHES.ID, STASHES.NAME, visibilityField, STASHES.CREATED_AT, STASHES.UPDATED_AT)
                .from(accountStashes)
                .join(STASHES)
                .on(stashIdField.eq(STASHES.ID))
                .where(conditions)
                .orderBy(orderBy)
                .limit(command.size())
                .offset(offset)
                .fetch(r -> new ClaimedStashSummary(
                        r.get(STASHES.ID),
                        r.get(STASHES.NAME),
                        parseVisibility(r.get(visibilityField)),
                        r.get(STASHES.CREATED_AT) != null
                                ? r.get(STASHES.CREATED_AT)
                                        .withOffsetSameInstant(ZoneOffset.UTC)
                                        .toLocalDateTime()
                                : null,
                        r.get(STASHES.UPDATED_AT) != null
                                ? r.get(STASHES.UPDATED_AT)
                                        .withOffsetSameInstant(ZoneOffset.UTC)
                                        .toLocalDateTime()
                                : null));

        final int totalPages = (int) Math.ceil((double) total / command.size());
        return new PagedResult<>(content, total, totalPages, command.size(), command.page());
    }

    private static StashVisibility parseVisibility(final String value) {
        if (value == null) return StashVisibility.SHARED;
        try {
            return StashVisibility.valueOf(value);
        } catch (IllegalArgumentException e) {
            return StashVisibility.SHARED;
        }
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
