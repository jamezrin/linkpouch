package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Value Object: StashName */
@Getter
@EqualsAndHashCode
@ToString
public final class StashName {

    private static final int MAX_LENGTH = 100;

    private final String value;

    private StashName(final String value) {
        this.value = value;
    }

    public static StashName of(final String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Stash name cannot be null or empty");
        }
        if (value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Stash name cannot exceed " + MAX_LENGTH + " characters");
        }
        return new StashName(value.trim());
    }
}
