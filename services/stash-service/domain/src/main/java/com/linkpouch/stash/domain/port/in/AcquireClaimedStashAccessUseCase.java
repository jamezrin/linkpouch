package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Stash;

/**
 * Issues a stash access token for the account that claimed the stash.
 * Does not require the stash signature — account ownership is sufficient proof.
 */
@FunctionalInterface
public interface AcquireClaimedStashAccessUseCase {

    Stash execute(AcquireClaimedStashAccessCommand command);
}
