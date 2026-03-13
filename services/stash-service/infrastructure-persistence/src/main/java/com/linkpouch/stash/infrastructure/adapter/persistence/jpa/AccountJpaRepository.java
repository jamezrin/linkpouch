package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.AccountJpaEntity;

@Repository
public interface AccountJpaRepository extends JpaRepository<AccountJpaEntity, UUID> {

    @Query(
            "SELECT a FROM AccountJpaEntity a JOIN FETCH a.providers p WHERE p.provider = :provider AND p.providerUserId = :providerUserId")
    Optional<AccountJpaEntity> findByProviders_ProviderAndProviderUserId(
            @Param("provider") String provider, @Param("providerUserId") String providerUserId);

    @Query("SELECT a FROM AccountJpaEntity a JOIN FETCH a.providers WHERE a.id = :id")
    Optional<AccountJpaEntity> findByIdWithProviders(@Param("id") UUID id);
}
