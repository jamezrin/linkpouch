package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.StashInfo;

/**
 * Validates that the caller may access the stash.
 * If the stash is password-protected, verifies the provided raw password.
 * Returns the StashInfo for subsequent token issuance.
 */
@FunctionalInterface
public interface AcquireStashAccessUseCase {

    StashInfo execute(AcquireStashAccessCommand command);
}
