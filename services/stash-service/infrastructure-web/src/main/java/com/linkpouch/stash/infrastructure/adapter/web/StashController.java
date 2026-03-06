package com.linkpouch.stash.infrastructure.adapter.web;

import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.StashesApi;
import com.linkpouch.stash.api.model.*;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.port.in.*;
import com.linkpouch.stash.domain.service.StashAccessClaims;
import com.linkpouch.stash.domain.service.StashSignatureService;
import com.linkpouch.stash.domain.service.StashTokenService;
import com.linkpouch.stash.infrastructure.adapter.web.mapper.ApiDtoMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class StashController implements StashesApi {

    private static final String BEARER_PREFIX = "Bearer ";

    private final CreateStashUseCase createStashUseCase;
    private final FindStashByIdQuery findStashByIdQuery;
    private final UpdateStashNameUseCase updateStashNameUseCase;
    private final DeleteStashUseCase deleteStashUseCase;
    private final AcquireStashAccessUseCase acquireStashAccessUseCase;
    private final SetStashPasswordUseCase setStashPasswordUseCase;
    private final RemoveStashPasswordUseCase removeStashPasswordUseCase;
    private final StashSignatureService signatureService;
    private final StashTokenService tokenService;
    private final ApiDtoMapper mapper;
    private final HttpServletRequest httpRequest;

    @Override
    public ResponseEntity<StashResponseDTO> createStash(final CreateStashRequestDTO createStashRequestDTO) {
        final var command =
                new CreateStashCommand(createStashRequestDTO.getName(), createStashRequestDTO.getPassword());
        final var stash = createStashUseCase.execute(command);

        final var response = mapper.mapOut(stash);
        final String signedUrl = signatureService.generateSignedUrl(
                stash.getId(), stash.getSecretKey().getValue());
        response.setSignedUrl(signedUrl);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Override
    public ResponseEntity<AccessTokenResponseDTO> acquireAccessToken(
            final UUID stashId,
            final String xStashSignature,
            final @Nullable AcquireAccessRequestDTO acquireAccessRequestDTO) {

        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        final String rawPassword = acquireAccessRequestDTO != null ? acquireAccessRequestDTO.getPassword() : null;

        // Throws PasswordRequiredException (401 PASSWORD_REQUIRED) or UnauthorizedException
        final var authenticatedStash =
                acquireStashAccessUseCase.execute(new AcquireStashAccessCommand(stashId, rawPassword));

        final String token = tokenService.issueToken(authenticatedStash);
        return ResponseEntity.ok(new AccessTokenResponseDTO(token, tokenService.getExpirySeconds()));
    }

    @Override
    public ResponseEntity<StashResponseDTO> getStash(final UUID stashId) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (stash.isPasswordProtected()) {
            final StashAccessClaims claims = getRequiredClaims();
            tokenService.validatePwdKey(claims, stashId, stash.getPasswordHash());
        }

        return ResponseEntity.ok(mapper.mapOut(stash));
    }

    @Override
    public ResponseEntity<StashResponseDTO> updateStash(
            final UUID stashId, final UpdateStashRequestDTO updateStashRequestDTO) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (stash.isPasswordProtected()) {
            final StashAccessClaims claims = getRequiredClaims();
            tokenService.validatePwdKey(claims, stashId, stash.getPasswordHash());
        }

        final var updatedStash = updateStashNameUseCase.execute(stashId, updateStashRequestDTO.getName());
        return ResponseEntity.ok(mapper.mapOut(updatedStash));
    }

    @Override
    public ResponseEntity<Void> deleteStash(final UUID stashId) {
        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (stash.isPasswordProtected()) {
            final StashAccessClaims claims = getRequiredClaims();
            tokenService.validatePwdKey(claims, stashId, stash.getPasswordHash());
        }

        deleteStashUseCase.execute(stashId);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<StashResponseDTO> setStashPassword(
            final UUID stashId, final String xStashSignature, final SetPasswordRequestDTO setPasswordRequestDTO) {

        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        // If the stash already has a password, the caller must prove knowledge of it via JWT
        if (stash.isPasswordProtected()) {
            final String token = extractBearerToken();
            final StashAccessClaims claims = tokenService.validateToken(token, stashId);
            tokenService.validatePwdKey(claims, stashId, stash.getPasswordHash());
        }

        final var updatedStash = setStashPasswordUseCase.execute(
                new SetStashPasswordCommand(stashId, setPasswordRequestDTO.getPassword()));
        return ResponseEntity.ok(mapper.mapOut(updatedStash));
    }

    @Override
    public ResponseEntity<Void> removeStashPassword(final UUID stashId, final String xStashSignature) {

        final var stash = findStashByIdQuery
                .execute(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(stashId, stash.getSecretKey().getValue(), xStashSignature)) {
            throw new UnauthorizedException("Invalid signature");
        }

        // Must prove knowledge of the current password via JWT
        final String token = extractBearerToken();
        final StashAccessClaims claims = tokenService.validateToken(token, stashId);
        tokenService.validatePwdKey(claims, stashId, stash.getPasswordHash());

        removeStashPasswordUseCase.execute(new RemoveStashPasswordCommand(stashId));
        return ResponseEntity.noContent().build();
    }

    /** Returns the JWT claims placed by the interceptor. Throws if missing (should not happen). */
    private StashAccessClaims getRequiredClaims() {
        final Object claims = httpRequest.getAttribute(StashJwtInterceptor.CLAIMS_ATTR);
        if (!(claims instanceof StashAccessClaims)) {
            throw new UnauthorizedException("Access token is missing");
        }
        return (StashAccessClaims) claims;
    }

    /** Extracts a raw token from the Authorization Bearer header. Used for signature-gated endpoints. */
    private String extractBearerToken() {
        final String authHeader = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
