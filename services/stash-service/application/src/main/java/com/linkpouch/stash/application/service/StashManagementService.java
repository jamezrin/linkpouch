package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.in.CreateStashCommand;
import com.linkpouch.stash.domain.port.in.CreateStashUseCase;
import com.linkpouch.stash.domain.port.in.DeleteStashUseCase;
import com.linkpouch.stash.domain.port.in.UpdateStashNameUseCase;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;

/**
 * Application Service: Stash Management Implements use cases with transaction boundaries at the
 * application layer.
 *
 * <p>Note: FindStashByIdQuery is not implemented directly here because it conflicts with
 * DeleteStashUseCase's void execute(UUID) signature. A thin adapter bean delegates to
 * {@link #findStashById(UUID)}.
 */
@UseCase
@RequiredArgsConstructor
public class StashManagementService
        implements CreateStashUseCase, UpdateStashNameUseCase, DeleteStashUseCase {

    private final StashRepository stashRepository;

    @Override
    @Transactional
    public Stash execute(final CreateStashCommand command) {
        final Stash stash = Stash.create(command.name());
        return stashRepository.save(stash);
    }

    /** Exposed for FindStashByIdAdapter. */
    @Transactional(readOnly = true)
    public Optional<Stash> findStashById(final UUID stashId) {
        return stashRepository.findById(stashId);
    }

    @Override
    @Transactional
    public Stash execute(final UUID stashId, final String newName) {
        final Stash stash =
                stashRepository
                        .findById(stashId)
                        .orElseThrow(
                                () -> new NotFoundException("Stash not found: " + stashId));
        stash.updateName(newName);
        return stashRepository.save(stash);
    }

    @Override
    @Transactional
    public void execute(final UUID stashId) {
        stashRepository.deleteById(stashId);
    }
}
