package com.linkpouch.stash.application.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.model.AccountProvider;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.model.StashVisibility;
import com.linkpouch.stash.domain.port.in.AcquireClaimedStashAccessCommand;
import com.linkpouch.stash.domain.port.in.AcquireClaimedStashAccessUseCase;
import com.linkpouch.stash.domain.port.in.ClaimStashCommand;
import com.linkpouch.stash.domain.port.in.ClaimStashUseCase;
import com.linkpouch.stash.domain.port.in.DisownStashCommand;
import com.linkpouch.stash.domain.port.in.DisownStashUseCase;
import com.linkpouch.stash.domain.port.in.UpdateStashVisibilityCommand;
import com.linkpouch.stash.domain.port.in.UpdateStashVisibilityUseCase;
import com.linkpouch.stash.domain.port.in.UpsertAccountCommand;
import com.linkpouch.stash.domain.port.in.UpsertAccountUseCase;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import com.linkpouch.stash.domain.service.StashSignatureService;

import lombok.RequiredArgsConstructor;

/**
 * Application Service: Account Management
 *
 * <p>Handles OAuth account upsert, stash claiming, disowning, visibility, and account-based access.
 */
@UseCase
@RequiredArgsConstructor
public class AccountService
        implements UpsertAccountUseCase,
                ClaimStashUseCase,
                DisownStashUseCase,
                UpdateStashVisibilityUseCase,
                AcquireClaimedStashAccessUseCase {

    private final AccountRepository accountRepository;
    private final StashRepository stashRepository;
    private final StashSignatureService stashSignatureService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public Account execute(final UpsertAccountCommand command) {
        final Optional<Account> existing =
                accountRepository.findByProviderKey(command.provider(), command.providerUserId());

        if (existing.isPresent()) {
            final Account account = existing.get();
            account.updateProfile(command.displayName(), command.email(), command.avatarUrl());
            return accountRepository.save(account);
        }

        final Account account = Account.create(command.displayName(), command.email(), command.avatarUrl());
        account.addProvider(new AccountProvider(UUID.randomUUID(), command.provider(), command.providerUserId()));
        return accountRepository.save(account);
    }

    @Override
    @Transactional
    public void execute(final ClaimStashCommand command) {
        final Stash stash =
                stashRepository.findById(command.stashId()).orElseThrow(() -> new NotFoundException("Stash not found"));

        final boolean validSig = stashSignatureService.validateSignature(
                stash.getId(), stash.getSecretKey().getValue(), command.signature());
        if (!validSig) {
            throw new UnauthorizedException("Invalid stash signature");
        }

        if (stash.isPasswordProtected()) {
            final String password = command.password();
            if (password == null || password.isBlank()) {
                throw new UnauthorizedException("Password required to claim this stash");
            }
            if (!passwordEncoder.matches(password, stash.getPasswordHash())) {
                throw new UnauthorizedException("Incorrect stash password");
            }
        }

        if (accountRepository.isStashClaimedByAnyone(command.stashId())) {
            throw new ForbiddenException("This pouch has already been claimed by another account");
        }

        accountRepository.claimStash(command.accountId(), command.stashId());

        stash.setVisibility(StashVisibility.PRIVATE);
        stashRepository.save(stash);
    }

    @Override
    @Transactional
    public void execute(final DisownStashCommand command) {
        if (!accountRepository.isStashClaimed(command.accountId(), command.stashId())) {
            throw new NotFoundException("Stash is not claimed by this account");
        }

        accountRepository.disownStash(command.accountId(), command.stashId());

        stashRepository.findById(command.stashId()).ifPresent(stash -> {
            stash.setVisibility(StashVisibility.SHARED);
            stashRepository.save(stash);
        });
    }

    @Override
    @Transactional
    public void execute(final UpdateStashVisibilityCommand command) {
        if (!accountRepository.isStashClaimed(command.accountId(), command.stashId())) {
            throw new ForbiddenException("Only the claiming account can change stash visibility");
        }

        final Stash stash = stashRepository
                .findById(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found"));

        stash.setVisibility(command.visibility());
        stashRepository.save(stash);
    }

    @Override
    @Transactional(readOnly = true)
    public Stash execute(final AcquireClaimedStashAccessCommand command) {
        if (!accountRepository.isStashClaimed(command.accountId(), command.stashId())) {
            throw new ForbiddenException("This pouch is not claimed by your account");
        }

        return stashRepository
                .findById(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found"));
    }
}
