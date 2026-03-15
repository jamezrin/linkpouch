package com.linkpouch.stash.domain.service;

import java.util.UUID;

import com.linkpouch.stash.domain.model.Stash;

/** Domain Service: Stash Access Token issuance and validation */
public interface StashTokenService {

    /**
     * Issues a signed JWT granting access to the given stash.
     *
     * @param stash        the stash being accessed
     * @param isClaimer    true if the caller is the account that claimed this stash
     * @param stashClaimed true if any account has claimed this stash (encoded so controllers
     *                     can check write permissions without a per-request DB query)
     */
    String issueToken(Stash stash, boolean isClaimer, boolean stashClaimed);

    /**
     * Parses and validates the JWT. Throws {@link com.linkpouch.stash.domain.exception.UnauthorizedException}
     * if invalid or expired.
     */
    StashAccessClaims validateToken(String token, UUID expectedStashId);

    /** Returns the configured token lifetime in seconds (used to populate {@code expiresIn} in responses). */
    int getExpirySeconds();
}
