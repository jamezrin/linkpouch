package com.linkpouch.stash.application.exception;

/**
 * Exception thrown when a request lacks valid authentication/authorization.
 * Maps to HTTP 401 Unauthorized.
 */
public class UnauthorizedException extends RuntimeException {
    
    public UnauthorizedException(String message) {
        super(message);
    }
    
    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}
