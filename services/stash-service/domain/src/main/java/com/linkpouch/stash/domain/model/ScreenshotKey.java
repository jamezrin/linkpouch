package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/**
 * Value Object: ScreenshotKey
 */
@Getter
@EqualsAndHashCode
@ToString
public final class ScreenshotKey {
    
    private final String value;
    
    private ScreenshotKey(String value) {
        this.value = value;
    }
    
    public static ScreenshotKey of(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("ScreenshotKey cannot be null or blank");
        }
        return new ScreenshotKey(value.trim());
    }
}
