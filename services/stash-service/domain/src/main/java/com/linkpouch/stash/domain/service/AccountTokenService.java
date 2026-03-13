package com.linkpouch.stash.domain.service;

import com.linkpouch.stash.domain.model.Account;

/** Domain Service: Account JWT issuance and validation */
public interface AccountTokenService {

    /** Issues a signed JWT granting account-level access. */
    String issueToken(Account account);

    /**
     * Parses and validates the JWT. Throws {@link com.linkpouch.stash.domain.exception.UnauthorizedException}
     * if invalid or expired.
     */
    AccountClaims validateToken(String token);

    /** Returns the configured token lifetime in seconds. */
    int getExpirySeconds();
}
