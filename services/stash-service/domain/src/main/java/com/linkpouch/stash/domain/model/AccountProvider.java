package com.linkpouch.stash.domain.model;

import java.util.UUID;

/**
 * Value object representing a link between an account and an OAuth provider identity.
 */
public record AccountProvider(UUID id, OAuthProvider provider, String providerUserId) {}
