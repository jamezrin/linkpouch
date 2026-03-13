package com.linkpouch.stash.domain.model;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/**
 * Aggregate root: an optional user account that can claim anonymous stashes.
 *
 * <p>Accounts are created/updated on successful OAuth login and may have multiple
 * provider identities (for future multi-provider linking support).
 */
@Getter
@EqualsAndHashCode(of = "id")
@ToString(of = {"id", "displayName"})
public class Account {

    private final UUID id;
    private String email;
    private String displayName;
    private String avatarUrl;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private final Set<AccountProvider> providers;

    public Account(
            UUID id,
            String email,
            String displayName,
            String avatarUrl,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            Set<AccountProvider> providers) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.providers = new HashSet<>(providers);
    }

    public static Account create(String displayName, String email, String avatarUrl) {
        return new Account(
                UUID.randomUUID(),
                email,
                displayName,
                avatarUrl,
                OffsetDateTime.now(),
                OffsetDateTime.now(),
                new HashSet<>());
    }

    public void updateProfile(String displayName, String email, String avatarUrl) {
        this.displayName = displayName;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.updatedAt = OffsetDateTime.now();
    }

    public void addProvider(AccountProvider provider) {
        this.providers.add(provider);
    }

    public Set<AccountProvider> getProviders() {
        return Collections.unmodifiableSet(providers);
    }
}
