package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

public record ClaimStashCommand(UUID accountId, UUID stashId, String signature, String password) {

    public ClaimStashCommand(UUID accountId, UUID stashId, String signature) {
        this(accountId, stashId, signature, null);
    }
}
