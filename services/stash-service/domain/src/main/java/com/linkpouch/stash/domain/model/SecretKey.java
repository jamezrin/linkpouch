package com.linkpouch.stash.domain.model;

import java.security.SecureRandom;
import java.util.Base64;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Value Object: SecretKey Represents a secret key used for HMAC signature generation. */
@Getter
@EqualsAndHashCode
@ToString(exclude = "value")
public final class SecretKey {

    private static final int KEY_LENGTH_BYTES = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final String value;

    private SecretKey(final String value) {
        this.value = value;
    }

    public static SecretKey of(final String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Secret key cannot be null or empty");
        }
        return new SecretKey(value);
    }

    public static SecretKey generate() {
        final byte[] bytes = new byte[KEY_LENGTH_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return new SecretKey(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }
}
