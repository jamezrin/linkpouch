package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;

@Repository
public interface LinkJpaRepository extends JpaRepository<LinkJpaEntity, UUID> {}
