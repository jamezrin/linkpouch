package com.linkpouch.stash.domain.exception;

/**
 * Exception thrown when a request lacks valid authentication/authorization. Maps to HTTP 401
 * Unauthorized.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(final String message) {
        super(message);
    }

    public UnauthorizedException(final String message, final Throwable cause) {
        super(message, cause);
    }
}
