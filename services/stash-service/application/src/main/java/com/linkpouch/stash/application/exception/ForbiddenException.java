package com.linkpouch.stash.application.exception;

/**
 * Exception thrown when an authenticated request is not authorized to access a resource. Maps to
 * HTTP 403 Forbidden.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(final String message) {
        super(message);
    }
}
