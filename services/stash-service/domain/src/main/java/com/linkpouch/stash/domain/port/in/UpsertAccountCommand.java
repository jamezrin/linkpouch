package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.OAuthProvider;

public record UpsertAccountCommand(
        OAuthProvider provider, String providerUserId, String email, String displayName, String avatarUrl) {}
