package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LinkJpaRepository extends JpaRepository<LinkJpaEntity, UUID> {
}
