package com.linkpouch.stash.infrastructure.adapter.web;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.linkpouch.stash.api.model.ErrorResponseDTO;
import com.linkpouch.stash.domain.exception.ForbiddenException;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.PasswordRequiredException;
import com.linkpouch.stash.domain.exception.SignatureRegeneratedException;
import com.linkpouch.stash.domain.exception.StashPrivateException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleNotFound(
            final NotFoundException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), null, request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponseDTO> handleBadRequest(
            final IllegalArgumentException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), null, request.getRequestURI());
    }

    @ExceptionHandler(PasswordRequiredException.class)
    public ResponseEntity<ErrorResponseDTO> handlePasswordRequired(
            final PasswordRequiredException ex, final HttpServletRequest request) {
        return buildResponse(
                HttpStatus.UNAUTHORIZED, ex.getMessage(),
                PasswordRequiredException.ERROR_CODE, request.getRequestURI());
    }

    @ExceptionHandler(SignatureRegeneratedException.class)
    public ResponseEntity<ErrorResponseDTO> handleSignatureRegenerated(
            final SignatureRegeneratedException ex, final HttpServletRequest request) {
        final var dto = new ErrorResponseDTO();
        dto.setTimestamp(OffsetDateTime.now());
        dto.setStatus(HttpStatus.UNAUTHORIZED.value());
        dto.setError(HttpStatus.UNAUTHORIZED.getReasonPhrase());
        dto.setMessage(ex.getMessage());
        dto.setErrorCode(SignatureRegeneratedException.ERROR_CODE);
        dto.setPath(request.getRequestURI());
        dto.setSignatureRefreshedAt(OffsetDateTime.of(ex.getSignatureRefreshedAt(), ZoneOffset.UTC));
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(dto);
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponseDTO> handleUnauthorized(
            final UnauthorizedException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), null, request.getRequestURI());
    }

    @ExceptionHandler(StashPrivateException.class)
    public ResponseEntity<ErrorResponseDTO> handleStashPrivate(
            final StashPrivateException ex, final HttpServletRequest request) {
        return buildResponse(
                HttpStatus.FORBIDDEN, ex.getMessage(),
                StashPrivateException.ERROR_CODE, request.getRequestURI());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponseDTO> handleForbidden(
            final ForbiddenException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage(), null, request.getRequestURI());
    }

    private ResponseEntity<ErrorResponseDTO> buildResponse(
            final HttpStatus status, final String message, final String errorCode, final String path) {
        final var dto = new ErrorResponseDTO();
        dto.setTimestamp(OffsetDateTime.now());
        dto.setStatus(status.value());
        dto.setError(status.getReasonPhrase());
        dto.setMessage(message);
        dto.setErrorCode(errorCode);
        dto.setPath(path);
        return ResponseEntity.status(status).body(dto);
    }
}
