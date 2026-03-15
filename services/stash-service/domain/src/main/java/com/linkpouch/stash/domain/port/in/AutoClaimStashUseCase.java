package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.Stash;

/**
 * Claims a freshly-created stash for the given account without signature or password checks.
 * Only safe to call immediately after stash creation, before any other account can claim it.
 */
@FunctionalInterface
public interface AutoClaimStashUseCase {

    Stash execute(UUID stashId, UUID accountId);
}
