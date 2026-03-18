package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Value Object: FolderName */
@Getter
@EqualsAndHashCode
@ToString
public final class FolderName {

    private static final int MAX_LENGTH = 255;

    private final String value;

    private FolderName(final String value) {
        this.value = value;
    }

    public static FolderName of(final String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Folder name cannot be null or empty");
        }
        if (value.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Folder name cannot exceed " + MAX_LENGTH + " characters");
        }
        return new FolderName(value.trim());
    }
}
