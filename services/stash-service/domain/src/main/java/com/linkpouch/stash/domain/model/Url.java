package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Value Object: Url */
@Getter
@EqualsAndHashCode
@ToString
public final class Url {

    private static final int MAX_LENGTH = 2048;

    private final String value;

    private Url(final String value) {
        this.value = value;
    }

    public static Url of(final String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("URL cannot be null or empty");
        }
        if (value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("URL cannot exceed " + MAX_LENGTH + " characters");
        }
        if (!isValidUrl(value)) {
            throw new IllegalArgumentException("Invalid URL format: " + value);
        }
        return new Url(value.trim());
    }

    private static boolean isValidUrl(final String url) {
        return url.startsWith("http://") || url.startsWith("https://");
    }
}
