package com.linkpouch.stash.infrastructure.adapter.web;

import com.linkpouch.stash.api.model.ErrorResponseDTO;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponseDTO> handleNotFound(NotFoundException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponseDTO> handleBadRequest(IllegalArgumentException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponseDTO> handleUnauthorized(UnauthorizedException ex, HttpServletRequest request) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), request.getRequestURI());
    }

    private ResponseEntity<ErrorResponseDTO> buildResponse(HttpStatus status, String message, String path) {
        var dto = new ErrorResponseDTO();
        dto.setTimestamp(OffsetDateTime.now());
        dto.setStatus(status.value());
        dto.setError(status.getReasonPhrase());
        dto.setMessage(message);
        dto.setPath(path);
        return ResponseEntity.status(status).body(dto);
    }
}
