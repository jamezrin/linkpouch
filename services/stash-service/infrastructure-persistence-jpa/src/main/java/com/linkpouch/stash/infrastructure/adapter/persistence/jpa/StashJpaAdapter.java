package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.PersistenceMapper;

import lombok.RequiredArgsConstructor;

/**
 * JPA Adapter for Stash Repository. Implements the driven port using JPA for simple CRUD
 * operations. NOTE: Transaction boundaries are managed in the application layer.
 */
@Component
@RequiredArgsConstructor
public class StashJpaAdapter implements StashRepository {

    private final StashJpaRepository jpaRepository;
    private final PersistenceMapper mapper;

    @Override
    public Stash save(final Stash stash) {
        final StashJpaEntity entity = mapper.mapOut(stash);
        final StashJpaEntity saved = jpaRepository.save(entity);
        return mapper.mapIn(saved);
    }

    @Override
    public Optional<Stash> findById(final UUID id) {
        return jpaRepository.findById(id).map(mapper::mapIn);
    }

    @Override
    public void deleteById(final UUID id) {
        jpaRepository.deleteById(id);
    }
}
