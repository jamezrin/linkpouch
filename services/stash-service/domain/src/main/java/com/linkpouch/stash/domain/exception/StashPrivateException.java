package com.linkpouch.stash.domain.exception;

/**
 * Thrown when an unauthenticated (or non-claimer) request tries to access a private stash.
 * Maps to HTTP 403 Forbidden with error code STASH_PRIVATE.
 */
public class StashPrivateException extends RuntimeException {

    public static final String ERROR_CODE = "STASH_PRIVATE";

    public StashPrivateException(final String message) {
        super(message);
    }
}
