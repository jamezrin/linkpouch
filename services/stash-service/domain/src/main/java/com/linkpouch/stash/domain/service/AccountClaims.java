package com.linkpouch.stash.domain.service;

import java.util.UUID;

/**
 * Domain value object carrying validated account JWT claims.
 *
 * <p>Decouples the web and application layers from the JJWT implementation types.
 */
public record AccountClaims(UUID accountId) {}
