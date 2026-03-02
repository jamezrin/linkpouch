package com.linkpouch.stash.domain.exception;

/**
 * Exception thrown when a password-protected stash is accessed without a valid password.
 * Maps to HTTP 401 Unauthorized with error code PASSWORD_REQUIRED.
 */
public class PasswordRequiredException extends UnauthorizedException {

    public static final String ERROR_CODE = "PASSWORD_REQUIRED";

    public PasswordRequiredException() {
        super("Password required to access this stash");
    }
}
