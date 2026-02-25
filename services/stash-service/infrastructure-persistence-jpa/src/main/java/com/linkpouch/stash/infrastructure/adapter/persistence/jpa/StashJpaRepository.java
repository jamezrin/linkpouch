package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;

@Repository
public interface StashJpaRepository extends JpaRepository<StashJpaEntity, UUID> {}
