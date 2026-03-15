package com.linkpouch.stash.domain.exception;

/**
 * Thrown when a stash access token's version does not match the current stash version.
 * This happens when access-control settings (password, visibility, signature) changed after
 * the token was issued. The client should re-acquire a fresh token.
 *
 * <p>Maps to HTTP 401 Unauthorized with errorCode {@value #ERROR_CODE}.
 */
public class TokenVersionMismatchException extends UnauthorizedException {

    public static final String ERROR_CODE = "TOKEN_VERSION_MISMATCH";

    public TokenVersionMismatchException() {
        super("Stash access token is outdated — please re-acquire");
    }
}
