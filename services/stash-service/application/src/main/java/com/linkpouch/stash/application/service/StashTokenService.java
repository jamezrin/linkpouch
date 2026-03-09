package com.linkpouch.stash.application.service;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.StashInfo;
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
 * <p>Token type {@code "stash_access"} is designed to coexist with future {@code "account_access"}
 * tokens issued by OAuth providers when account linking is implemented.
 *
 * <p>Password invalidation: when a stash has a password, the JWT carries a {@code pwdKey} claim
 * derived from {@code HMAC(signingKey, stashId + ":" + passwordHash)}. Changing or removing the
 * password changes the BCrypt hash, which changes the derived {@code pwdKey}, making all
 * previously issued JWTs fail validation — no server-side token store needed.
 */
@Slf4j
@Service
public class StashTokenService implements com.linkpouch.stash.domain.service.StashTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String ISSUER = "linkpouch";
    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_PWD_KEY = "pwdKey";
    private static final String TOKEN_TYPE_STASH = "stash_access";
    private static final Base64.Encoder BASE64URL_ENCODER =
            Base64.getUrlEncoder().withoutPadding();

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
     * If the stash is password-protected, a {@code pwdKey} claim is included so that
     * the token is automatically invalidated when the password changes.
     */
    @Override
    public String issueToken(final StashInfo stash) {
        final Instant now = Instant.now();
        final var builder = Jwts.builder()
                .issuer(ISSUER)
                .subject(stash.getId().toString())
                .claim(CLAIM_TYPE, TOKEN_TYPE_STASH)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirySeconds)))
                .signWith(signingKey);

        if (stash.isPasswordProtected()) {
            builder.claim(CLAIM_PWD_KEY, computePwdKey(stash.getId(), stash.getPasswordHash()));
        }

        return builder.compact();
    }

    /**
     * Parses and validates the JWT. Throws {@link UnauthorizedException} if invalid or expired.
     * Does NOT check the pwdKey claim — that requires loading the stash and is done separately.
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

            final String pwdKey = claims.get(CLAIM_PWD_KEY, String.class);
            return new StashAccessClaims(expectedStashId, pwdKey);
        } catch (JwtException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            throw new UnauthorizedException("Invalid or expired access token");
        }
    }

    /**
     * Validates the {@code pwdKey} claim against the stash's current password hash.
     * Must be called (and will throw) when the stash is password-protected.
     * Throws {@link UnauthorizedException} if the claim is missing or doesn't match —
     * which happens when the password was changed after the token was issued.
     */
    @Override
    public void validatePwdKey(final StashAccessClaims claims, final UUID stashId, final String currentPasswordHash) {
        final String claimedPwdKey = claims.pwdKey();
        if (claimedPwdKey == null) {
            throw new UnauthorizedException(
                    "Password protection was added after this token was issued; please re-authenticate");
        }

        final String expectedPwdKey = computePwdKey(stashId, currentPasswordHash);
        if (!MessageDigest.isEqual(
                claimedPwdKey.getBytes(StandardCharsets.UTF_8), expectedPwdKey.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("Password was changed; please re-authenticate");
        }
    }

    @Override
    public int getExpirySeconds() {
        return (int) expirySeconds;
    }

    /** Derives the pwdKey claim value. Changes whenever the stash's passwordHash changes. */
    private String computePwdKey(final UUID stashId, final String passwordHash) {
        final byte[] data = (stashId + ":" + passwordHash).getBytes(StandardCharsets.UTF_8);
        return BASE64URL_ENCODER.encodeToString(hmac(signingKey.getEncoded(), data));
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
