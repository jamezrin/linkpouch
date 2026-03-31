package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountProxySettingsJpaEntity;

@Repository
public interface AccountProxySettingsJpaRepository extends JpaRepository<AccountProxySettingsJpaEntity, UUID> {

    Optional<AccountProxySettingsJpaEntity> findByAccountId(UUID accountId);
}
