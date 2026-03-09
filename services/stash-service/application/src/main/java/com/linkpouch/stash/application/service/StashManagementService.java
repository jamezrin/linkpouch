package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.PasswordRequiredException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.model.StashLinksAggregate;
import com.linkpouch.stash.domain.port.in.AcquireStashAccessCommand;
import com.linkpouch.stash.domain.port.in.AcquireStashAccessUseCase;
import com.linkpouch.stash.domain.port.in.CreateStashCommand;
import com.linkpouch.stash.domain.port.in.CreateStashUseCase;
import com.linkpouch.stash.domain.port.in.DeleteStashUseCase;
import com.linkpouch.stash.domain.port.in.RemoveStashPasswordCommand;
import com.linkpouch.stash.domain.port.in.RemoveStashPasswordUseCase;
import com.linkpouch.stash.domain.port.in.SetStashPasswordCommand;
import com.linkpouch.stash.domain.port.in.SetStashPasswordUseCase;
import com.linkpouch.stash.domain.port.in.UpdateStashNameUseCase;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;

/**
 * Application Service: StashLinksAggregate Management Implements use cases with transaction boundaries at the
 * application layer.
 *
 * <p>Note: FindStashByIdQuery is not implemented directly here because it conflicts with
 * DeleteStashUseCase's void execute(UUID) signature. A thin adapter bean delegates to
 * {@link #findStashById(UUID)}.
 */
@UseCase
@RequiredArgsConstructor
public class StashManagementService
        implements CreateStashUseCase,
                UpdateStashNameUseCase,
                DeleteStashUseCase,
                AcquireStashAccessUseCase,
                SetStashPasswordUseCase,
                RemoveStashPasswordUseCase {

    private final StashRepository stashRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public StashLinksAggregate execute(final CreateStashCommand command) {
        final StashLinksAggregate stash = StashLinksAggregate.create(command.name());
        if (command.password() != null && !command.password().isBlank()) {
            stash.setPasswordHash(passwordEncoder.encode(command.password()));
        }
        return stashRepository.save(stash);
    }

    /** Exposed for FindStashByIdAdapter. */
    @Transactional(readOnly = true)
    public Optional<Stash> findStashById(final UUID stashId) {
        return stashRepository.findById(stashId);
    }

    @Override
    @Transactional
    public StashLinksAggregate execute(final UUID stashId, final String newName) {
        final StashLinksAggregate stash = stashRepository
                .findByIdWithLinks(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));
        stash.updateName(newName);
        return stashRepository.save(stash);
    }

    @Override
    @Transactional
    public void execute(final UUID stashId) {
        stashRepository.deleteById(stashId);
    }

    /**
     * Validates access to the stash. If the stash is password-protected, the raw password must be
     * provided and match. Returns the stash for subsequent JWT issuance.
     *
     * @throws PasswordRequiredException if the stash is password-protected and no password was provided
     * @throws UnauthorizedException     if the provided password is incorrect
     */
    @Override
    @Transactional(readOnly = true)
    public Stash execute(final AcquireStashAccessCommand command) {
        final Stash stash = stashRepository
                .findById(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));

        if (stash.isPasswordProtected()) {
            if (command.rawPassword() == null || command.rawPassword().isBlank()) {
                throw new PasswordRequiredException();
            }
            if (!passwordEncoder.matches(command.rawPassword(), stash.getPasswordHash())) {
                throw new UnauthorizedException("Incorrect password");
            }
        }

        return stash;
    }

    @Override
    @Transactional
    public StashLinksAggregate execute(final SetStashPasswordCommand command) {
        final StashLinksAggregate stash = stashRepository
                .findByIdWithLinks(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));
        stash.setPasswordHash(passwordEncoder.encode(command.rawPassword()));
        return stashRepository.save(stash);
    }

    @Override
    @Transactional
    public void execute(final RemoveStashPasswordCommand command) {
        final StashLinksAggregate stash = stashRepository
                .findByIdWithLinks(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));
        stash.removePassword();
        stashRepository.save(stash);
    }
}
