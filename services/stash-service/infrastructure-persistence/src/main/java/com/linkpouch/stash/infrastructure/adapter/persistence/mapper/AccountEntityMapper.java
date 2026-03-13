package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.mapstruct.Mapper;

import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.AccountProvider;
import com.linkpouch.stash.domain.model.OAuthProvider;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountProviderJpaEntity;

@Mapper(componentModel = "spring", config = MappingConfig.class)
public interface AccountEntityMapper {

    default Account mapIn(AccountJpaEntity entity) {
        if (entity == null) return null;
        final Set<AccountProvider> providers = entity.getProviders().stream()
                .map(p -> new AccountProvider(
                        p.getId(),
                        OAuthProvider.valueOf(p.getProvider()),
                        p.getProviderUserId()))
                .collect(Collectors.toSet());
        return new Account(
                entity.getId(),
                entity.getEmail(),
                entity.getDisplayName(),
                entity.getAvatarUrl(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                providers);
    }

    default AccountJpaEntity mapOut(Account account) {
        if (account == null) return null;
        final AccountJpaEntity entity = AccountJpaEntity.builder()
                .id(account.getId())
                .email(account.getEmail())
                .displayName(account.getDisplayName())
                .avatarUrl(account.getAvatarUrl())
                .build();

        final List<AccountProviderJpaEntity> providerEntities = account.getProviders().stream()
                .map(p -> AccountProviderJpaEntity.builder()
                        .id(p.id())
                        .account(entity)
                        .provider(p.provider().name())
                        .providerUserId(p.providerUserId())
                        .build())
                .collect(Collectors.toList());
        entity.getProviders().addAll(providerEntities);
        return entity;
    }
}
