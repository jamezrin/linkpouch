package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/**
 * Value Object: LinkTitle
 */
@Getter
@EqualsAndHashCode
@ToString
public final class LinkTitle {
    
    private static final int MAX_LENGTH = 500;
    
    private final String value;
    
    private LinkTitle(String value) {
        this.value = value;
    }
    
    public static LinkTitle of(String value) {
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
        return new LinkTitle(trimmed);
    }
}
