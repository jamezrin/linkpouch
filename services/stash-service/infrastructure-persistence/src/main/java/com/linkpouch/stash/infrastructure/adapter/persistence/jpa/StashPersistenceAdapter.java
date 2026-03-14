package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.LinkEntityMapper;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.StashEntityMapper;

import lombok.RequiredArgsConstructor;

/**
 * JPA Adapter for Stash Repository. Uses aggregate-root save with cascade to maintain link
 * collection integrity. NOTE: Transaction boundaries are managed in the application layer.
 */
@Component
@RequiredArgsConstructor
public class StashPersistenceAdapter implements StashRepository {

    private final StashJpaRepository jpaRepository;
    private final StashEntityMapper stashMapper;
    private final LinkEntityMapper linkMapper;

    @Override
    public Stash save(final Stash stash) {
        final Optional<StashJpaEntity> existingOpt = jpaRepository.findByIdWithLinks(stash.getId());

        final StashJpaEntity entity;
        if (existingOpt.isPresent()) {
            entity = existingOpt.get();
            stashMapper.updateEntity(stash, entity);
            syncLinks(stash, entity);
        } else {
            entity = stashMapper.mapOut(stash);
            // links collection is empty for a brand new stash
        }

        final StashJpaEntity saved = jpaRepository.save(entity);
        return stashMapper.mapIn(saved);
    }

    @Override
    public Optional<Stash> findById(final UUID id) {
        return jpaRepository.findByIdWithLinks(id).map(stashMapper::mapIn);
    }

    @Override
    public Optional<Stash> findByIdWithLinks(final UUID id) {
        return jpaRepository.findByIdWithLinks(id).map(stashMapper::mapIn);
    }

    @Override
    public void deleteById(final UUID id) {
        jpaRepository.deleteById(id);
    }

    /**
     * Synchronises the JPA entity's link collection with the domain model. Adds new links, updates
     * existing ones, and lets orphanRemoval delete removed ones.
     */
    private void syncLinks(final Stash stash, final StashJpaEntity entity) {
        final Map<UUID, LinkJpaEntity> existingById = new HashMap<>();
        for (final LinkJpaEntity le : entity.getLinks()) {
            existingById.put(le.getId(), le);
        }

        final Set<UUID> domainLinkIds =
                stash.getLinks().stream().map(Link::getId).collect(Collectors.toSet());

        // Remove links no longer in the domain model (orphanRemoval will delete them)
        entity.getLinks().removeIf(le -> !domainLinkIds.contains(le.getId()));

        // Add new or update existing link entities
        for (final Link domainLink : stash.getLinks()) {
            final LinkJpaEntity existing = existingById.get(domainLink.getId());
            if (existing != null) {
                linkMapper.updateEntity(domainLink, existing);
            } else {
                final LinkJpaEntity newEntity = linkMapper.mapOut(domainLink);
                newEntity.setStash(entity);
                entity.getLinks().add(newEntity);
            }
        }
    }
}
