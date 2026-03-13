package com.linkpouch.stash.domain.port.in;

@FunctionalInterface
public interface ClaimStashUseCase {

    /**
     * Claims a stash for an account.
     * Verifies the HMAC signature and, for password-protected stashes, the password.
     */
    void execute(ClaimStashCommand command);
}
