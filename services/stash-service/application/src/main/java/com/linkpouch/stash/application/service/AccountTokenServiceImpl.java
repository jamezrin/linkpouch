package com.linkpouch.stash.application.service;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.Account;
import com.linkpouch.stash.domain.service.AccountClaims;
import com.linkpouch.stash.domain.service.AccountTokenService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

/**
 * Application Service: Account Access Token
 *
 * <p>Issues and validates long-lived JWTs (HS256) that identify an account.
 * The signing key is derived from the same master key as the stash token service,
 * but uses a different derivation prefix so the keys are distinct — passing an
 * account JWT to a stash endpoint will produce a 401.
 */
@Slf4j
@Service
public class AccountTokenServiceImpl implements AccountTokenService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String ISSUER = "linkpouch";
    private static final String CLAIM_TYPE = "type";
    private static final String TOKEN_TYPE_ACCOUNT = "account_access";

    private final javax.crypto.SecretKey signingKey;
    private final long expirySeconds;

    public AccountTokenServiceImpl(
            @Value("${linkpouch.signature.master-key}") final String masterKey,
            @Value("${linkpouch.account.jwt.expiry-days:30}") final long expiryDays) {
        // Derive signing key from master key using a different prefix than stash tokens
        final byte[] derived = hmac(
                masterKey.getBytes(StandardCharsets.UTF_8),
                "linkpouch-account-jwt-signing".getBytes(StandardCharsets.UTF_8));
        this.signingKey = Keys.hmacShaKeyFor(derived);
        this.expirySeconds = expiryDays * 86400L;
    }

    @Override
    public String issueToken(final Account account) {
        final Instant now = Instant.now();
        return Jwts.builder()
                .issuer(ISSUER)
                .subject(account.getId().toString())
                .claim(CLAIM_TYPE, TOKEN_TYPE_ACCOUNT)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirySeconds)))
                .signWith(signingKey)
                .compact();
    }

    @Override
    public AccountClaims validateToken(final String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Account token is missing");
        }
        try {
            final Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            if (!TOKEN_TYPE_ACCOUNT.equals(claims.get(CLAIM_TYPE, String.class))) {
                throw new UnauthorizedException("Token is not an account token");
            }

            return new AccountClaims(UUID.fromString(claims.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Account JWT validation failed: {}", e.getMessage());
            throw new UnauthorizedException("Invalid or expired account token");
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
