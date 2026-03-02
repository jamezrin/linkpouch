package com.linkpouch.stash.domain.service;

import java.util.UUID;

/**
 * Domain value object carrying validated JWT claims for stash access.
 *
 * <p>Decouples the web and application layers from JJWT implementation types.
 * The {@code pwdKey} field is {@code null} for stashes without a password.
 */
public record StashAccessClaims(UUID stashId, String pwdKey) {}
