package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.Account;

@FunctionalInterface
public interface UpsertAccountUseCase {

    /**
     * Creates or updates an account for the given OAuth provider identity.
     * On re-login, updates the displayName, email, and avatarUrl from the provider.
     */
    Account execute(UpsertAccountCommand command);
}
