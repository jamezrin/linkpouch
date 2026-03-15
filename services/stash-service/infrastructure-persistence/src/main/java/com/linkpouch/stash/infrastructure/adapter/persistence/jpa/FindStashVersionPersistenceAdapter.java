package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.port.in.FindStashVersionQuery;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class FindStashVersionPersistenceAdapter implements FindStashVersionQuery {

    private final StashJpaRepository stashJpaRepository;

    @Override
    public Optional<Integer> execute(final UUID stashId) {
        return stashJpaRepository.findVersionById(stashId);
    }
}
