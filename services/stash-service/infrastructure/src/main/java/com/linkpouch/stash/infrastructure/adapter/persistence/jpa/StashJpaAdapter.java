package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.model.StashName;
import com.linkpouch.stash.domain.model.SecretKey;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * JPA Adapter for Stash Repository.
 * Implements the driven port using JPA for simple CRUD operations.
 * NOTE: Transaction boundaries are managed in the application layer.
 */
@Component
@RequiredArgsConstructor
public class StashJpaAdapter implements StashRepository {
    
    private final StashJpaRepository jpaRepository;
    
    @Override
    public Stash save(Stash stash) {
        StashJpaEntity entity = toJpaEntity(stash);
        StashJpaEntity saved = jpaRepository.save(entity);
        return toDomain(saved);
    }
    
    @Override
    public Optional<Stash> findById(UUID id) {
        return jpaRepository.findById(id)
                .map(this::toDomain);
    }
    
    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }
    
    private Stash toDomain(StashJpaEntity entity) {
        if (entity == null) return null;
        
        return Stash.builder()
                .id(entity.getId())
                .name(StashName.of(entity.getName()))
                .secretKey(SecretKey.of(entity.getSecretKey()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
    
    private StashJpaEntity toJpaEntity(Stash stash) {
        if (stash == null) return null;
        
        return StashJpaEntity.builder()
                .id(stash.getId())
                .name(stash.getName().getValue())
                .secretKey(stash.getSecretKey().getValue())
                .createdAt(stash.getCreatedAt())
                .updatedAt(stash.getUpdatedAt())
                .build();
    }
}
