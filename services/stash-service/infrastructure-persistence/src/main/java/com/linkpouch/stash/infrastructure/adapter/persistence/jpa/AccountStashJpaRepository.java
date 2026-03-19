package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountStashId;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountStashJpaEntity;

@Repository
public interface AccountStashJpaRepository extends JpaRepository<AccountStashJpaEntity, AccountStashId> {

    @Query("SELECT a.id.stashId FROM AccountStashJpaEntity a WHERE a.id.accountId = :accountId")
    List<UUID> findStashIdsByAccountId(@Param("accountId") UUID accountId);

    boolean existsById(AccountStashId id);

    boolean existsByIdStashId(UUID stashId);

    @Query("SELECT a.id.accountId FROM AccountStashJpaEntity a WHERE a.id.stashId = :stashId")
    Optional<UUID> findClaimerAccountId(@Param("stashId") UUID stashId);

    @Query("SELECT a.id.accountId FROM AccountStashJpaEntity a WHERE a.id.stashId = :stashId ORDER BY a.claimedAt ASC")
    List<UUID> findAccountIdsByStashId(@Param("stashId") UUID stashId);
}
