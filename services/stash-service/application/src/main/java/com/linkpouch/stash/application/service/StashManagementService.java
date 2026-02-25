package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.inbound.StashManagementUseCase;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;

/**
 * Application Service: Stash Management Implements use cases with transaction boundaries at the
 * application layer.
 */
@Service
@RequiredArgsConstructor
public class StashManagementService implements StashManagementUseCase {

    private final StashRepository stashRepository;

    @Override
    @Transactional
    public Stash createStash(final String name) {
        final Stash stash = Stash.create(name);
        return stashRepository.save(stash);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Stash> findStashById(final UUID stashId) {
        return stashRepository.findById(stashId);
    }

    @Override
    @Transactional
    public Stash updateStashName(final UUID stashId, final String newName) {
        final Stash stash =
                stashRepository
                        .findById(stashId)
                        .orElseThrow(
                                () -> new IllegalArgumentException("Stash not found: " + stashId));
        stash.updateName(newName);
        return stashRepository.save(stash);
    }

    @Override
    @Transactional
    public void deleteStash(final UUID stashId) {
        stashRepository.deleteById(stashId);
    }
}
