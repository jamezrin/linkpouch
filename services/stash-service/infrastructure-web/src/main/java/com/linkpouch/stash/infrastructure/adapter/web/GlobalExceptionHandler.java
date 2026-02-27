package com.linkpouch.stash.infrastructure.adapter.web;

import java.time.OffsetDateTime;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.linkpouch.stash.api.model.ErrorResponseDTO;
import com.linkpouch.stash.application.exception.ForbiddenException;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleNotFound(
            final NotFoundException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponseDTO> handleBadRequest(
            final IllegalArgumentException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponseDTO> handleUnauthorized(
            final UnauthorizedException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponseDTO> handleForbidden(
            final ForbiddenException ex, final HttpServletRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request.getRequestURI());
    }

    private ResponseEntity<ErrorResponseDTO> buildResponse(
            final HttpStatus status, final String message, final String path) {
        final var dto = new ErrorResponseDTO();
        dto.setTimestamp(OffsetDateTime.now());
        dto.setStatus(status.value());
        dto.setError(status.getReasonPhrase());
        dto.setMessage(message);
        dto.setPath(path);
        return ResponseEntity.status(status).body(dto);
    }
}
