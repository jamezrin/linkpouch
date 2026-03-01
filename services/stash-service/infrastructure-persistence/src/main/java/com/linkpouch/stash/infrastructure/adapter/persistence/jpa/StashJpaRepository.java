package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;

@Repository
public interface StashJpaRepository extends JpaRepository<StashJpaEntity, UUID> {

    @Query("SELECT s FROM StashJpaEntity s LEFT JOIN FETCH s.links WHERE s.id = :id")
    Optional<StashJpaEntity> findByIdWithLinks(@Param("id") UUID id);
}
