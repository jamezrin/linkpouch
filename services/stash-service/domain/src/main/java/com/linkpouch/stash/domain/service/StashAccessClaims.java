package com.linkpouch.stash.domain.service;

import java.util.UUID;

/**
 * Domain value object carrying validated JWT claims for stash access.
 *
 * <p>Decouples the web and application layers from JJWT implementation types.
 *
 * <p>{@code version} is matched against the DB value on every request by {@code StashJwtInterceptor}
 * to immediately invalidate tokens after access-control mutations.
 *
 * <p>{@code stashClaimed} is encoded at token-issue time and lets controllers check write
 * permissions without a per-request DB query.
 */
public record StashAccessClaims(UUID stashId, int version, boolean claimer, boolean stashClaimed) {}
