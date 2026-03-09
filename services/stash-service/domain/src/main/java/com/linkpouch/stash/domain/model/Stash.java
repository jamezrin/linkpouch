package com.linkpouch.stash.domain.model;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Read model for a stash without its links collection.
 * Used for identity checks, signature validation, and password gating —
 * contexts that do not require the full aggregate.
 */
@Getter
@RequiredArgsConstructor
@EqualsAndHashCode(of = "id")
public class Stash {

    private final UUID id;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final StashName name;
    private final SecretKey secretKey;
    private final String passwordHash;

    public boolean isPasswordProtected() {
        return passwordHash != null;
    }
}
