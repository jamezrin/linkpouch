package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Stash;

/**
 * Validates that the caller may access the stash.
 * If the stash is password-protected, verifies the provided raw password.
 * Returns the Stash for subsequent token issuance.
 */
@FunctionalInterface
public interface AcquireStashAccessUseCase {

    Stash execute(AcquireStashAccessCommand command);
}
