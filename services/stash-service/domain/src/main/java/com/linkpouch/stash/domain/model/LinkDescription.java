package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Value Object: LinkDescription */
@Getter
@EqualsAndHashCode
@ToString
public final class LinkDescription {

    private static final int MAX_LENGTH = 2000;

    private final String value;

    private LinkDescription(final String value) {
        this.value = value;
    }

    public static LinkDescription of(final String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > MAX_LENGTH) {
            trimmed = trimmed.substring(0, MAX_LENGTH);
        }
        return new LinkDescription(trimmed);
    }
}
