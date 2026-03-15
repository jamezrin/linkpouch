package com.linkpouch.stash.application.service;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.service.StashAccessClaims;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

/**
 * Application Service: Stash Access Token
 *
 * <p>Issues and validates short-lived JWTs (HS256) that grant access to a stash.
 *
 * <p>Token type {@code "stash_access"} is designed to coexist with {@code "account_access"}
 * tokens issued by OAuth providers.
 *
 * <p>Version-based invalidation: the JWT carries the stash's {@code version} integer. On every
 * data request the {@code StashJwtInterceptor} checks the token version against the DB value.
 * A mismatch (stale token) returns {@code TOKEN_VERSION_MISMATCH (401)}, and the frontend
 * re-acquires immediately. This guarantees that access-control changes (password, visibility,
 * signature regeneration, claim/disown) take effect within one request.
 */
@Slf4j
@Service
public class StashTokenService implements com.linkpouch.stash.domain.service.StashTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String ISSUER = "linkpouch";
    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_VERSION = "version";
    private static final String CLAIM_CLAIMER = "claimer";
    private static final String CLAIM_STASH_CLAIMED = "stashClaimed";
    private static final String TOKEN_TYPE_STASH = "stash_access";

    private final SecretKey signingKey;
    private final long expirySeconds;

    public StashTokenService(
            @Value("${linkpouch.signature.master-key}") final String masterKey,
            @Value("${linkpouch.jwt.expiry-hours:8}") final long expiryHours) {
        // Derive a 256-bit HS256 signing key from the master key so we only need one env var.
        final byte[] derived = hmac(
                masterKey.getBytes(StandardCharsets.UTF_8), "linkpouch-jwt-signing".getBytes(StandardCharsets.UTF_8));
        this.signingKey = Keys.hmacShaKeyFor(derived);
        this.expirySeconds = expiryHours * 3600L;
    }

    /**
     * Issues a signed JWT granting access to the given stash.
     *
     * @param stash        the stash being accessed
     * @param isClaimer    true if the caller is the account that claimed this stash
     * @param stashClaimed true if any account has claimed this stash
     */
    @Override
    public String issueToken(final Stash stash, final boolean isClaimer, final boolean stashClaimed) {
        final Instant now = Instant.now();
        final var builder = Jwts.builder()
                .issuer(ISSUER)
                .subject(stash.getId().toString())
                .claim(CLAIM_TYPE, TOKEN_TYPE_STASH)
                .claim(CLAIM_VERSION, stash.getVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirySeconds)))
                .signWith(signingKey);

        if (isClaimer) {
            builder.claim(CLAIM_CLAIMER, true);
        }
        if (stashClaimed) {
            builder.claim(CLAIM_STASH_CLAIMED, true);
        }

        return builder.compact();
    }

    /**
     * Parses and validates the JWT. Throws {@link UnauthorizedException} if invalid or expired.
     *
     * @param token           the raw JWT string
     * @param expectedStashId the stash UUID from the request path
     * @return the verified claims as a {@link StashAccessClaims}
     */
    @Override
    public StashAccessClaims validateToken(final String token, final UUID expectedStashId) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Access token is missing");
        }
        try {
            final Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!expectedStashId.toString().equals(claims.getSubject())) {
                throw new UnauthorizedException("Token not valid for this stash");
            }

            final int version =
                    claims.get(CLAIM_VERSION, Integer.class) != null ? claims.get(CLAIM_VERSION, Integer.class) : 0;
            final boolean claimer = Boolean.TRUE.equals(claims.get(CLAIM_CLAIMER, Boolean.class));
            final boolean stashClaimed = Boolean.TRUE.equals(claims.get(CLAIM_STASH_CLAIMED, Boolean.class));
            return new StashAccessClaims(expectedStashId, version, claimer, stashClaimed);
        } catch (JwtException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            throw new UnauthorizedException("Invalid or expired access token");
        }
    }

    @Override
    public int getExpirySeconds() {
        return (int) expirySeconds;
    }

    private static byte[] hmac(final byte[] key, final byte[] data) {
        try {
            final Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(key, HMAC_ALGORITHM));
            return mac.doFinal(data);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }
}
