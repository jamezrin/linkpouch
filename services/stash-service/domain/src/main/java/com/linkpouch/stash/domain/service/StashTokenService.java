package com.linkpouch.stash.domain.service;

import java.util.UUID;

import com.linkpouch.stash.domain.model.StashInfo;

/** Domain Service: Stash Access Token issuance and validation */
public interface StashTokenService {

    /**
     * Issues a signed JWT granting access to the given stash.
     * If the stash is password-protected, a {@code pwdKey} claim is included so that
     * the token is automatically invalidated when the password changes.
     */
    String issueToken(StashInfo stash);

    /**
     * Parses and validates the JWT. Throws {@link com.linkpouch.stash.domain.exception.UnauthorizedException}
     * if invalid or expired.
     * Does NOT check the pwdKey claim — that requires loading the stash and is done separately.
     */
    StashAccessClaims validateToken(String token, UUID expectedStashId);

    /**
     * Validates the {@code pwdKey} claim against the stash's current password hash.
     * Must be called when the stash is password-protected.
     * Throws {@link com.linkpouch.stash.domain.exception.UnauthorizedException} if the claim is
     * missing or doesn't match — which happens when the password was changed after token issuance.
     */
    void validatePwdKey(StashAccessClaims claims, UUID stashId, String currentPasswordHash);

    /** Returns the configured token lifetime in seconds (used to populate {@code expiresIn} in responses). */
    int getExpirySeconds();
}
