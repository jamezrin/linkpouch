package com.linkpouch.stash.domain.model;

import java.io.Serializable;

public record EmbeddabilityResult(boolean embeddable, String reason) implements Serializable {

    public static EmbeddabilityResult ofEmbeddable() {
        return new EmbeddabilityResult(true, null);
    }

    public static EmbeddabilityResult blocked(final String reason) {
        return new EmbeddabilityResult(false, reason);
    }

    public static EmbeddabilityResult unreachable() {
        return new EmbeddabilityResult(false, "unreachable");
    }
}
