package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StashJpaRepository extends JpaRepository<StashJpaEntity, UUID> {
}
